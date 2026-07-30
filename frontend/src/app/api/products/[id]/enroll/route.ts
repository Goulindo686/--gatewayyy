import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);

    try {
        const body = await req.json();
        const emailRaw = typeof body?.email === 'string' ? body.email : '';
        const normalizedEmail = emailRaw.toLowerCase().trim();

        if (!normalizedEmail) return jsonError('E-mail é obrigatório');

        const { data: products, error: productError } = await supabase
            .from('products')
            .select('id, name')
            .eq('id', id)
            .eq('user_id', auth.user.id);

        const product = products?.[0];
        if (productError || !product) return jsonError('Você não tem permissão para gerenciar este produto.', 403);

        const { data: uniqueSettings, error: settingsError } = await supabase
            .from('unique_delivery_settings')
            .select('enabled')
            .eq('product_id', id)
            .maybeSingle();
        const settingsUnavailableDuringRollout = settingsError
            && (
                ['42P01', 'PGRST205'].includes(String(settingsError.code || ''))
                || /schema cache|does not exist/i.test(settingsError.message || '')
            );
        if (settingsError && !settingsUnavailableDuringRollout) {
            return jsonError('Erro ao verificar a modalidade de entrega.', 500);
        }
        if (uniqueSettings?.enabled) {
            return jsonError(
                'Este produto usa Entrega Única. Selecione Área de Membros antes de liberar acesso manual.',
                409,
            );
        }

        const { data: existingUsers, error: searchErr } = await supabase
            .from('users')
            .select('id, email')
            .ilike('email', normalizedEmail);

        if (searchErr) return jsonError('Erro ao buscar usuário', 500);

        let user = existingUsers && existingUsers.length > 0 ? existingUsers[0] : null;

        if (!user) {
            const baseUserData: any = {
                name: 'Estudante (Manual)',
                email: normalizedEmail,
                role: 'customer',
                status: 'active'
            };

            let newUser: any = null;
            let createError: any = null;

            ({ data: newUser, error: createError } = await supabase
                .from('users')
                .insert({ ...baseUserData, password_hash: 'MANUAL_ENROLLMENT_PENDING_SET' })
                .select('id, email')
                .single());

            if (createError && /password_hash/i.test(createError.message || '')) {
                ({ data: newUser, error: createError } = await supabase
                    .from('users')
                    .insert({ ...baseUserData, password: 'MANUAL_ENROLLMENT_PENDING_SET' })
                    .select('id, email')
                    .single());
            }

            if (createError || !newUser) return jsonError('Erro ao criar usuário', 500);
            user = newUser;
        }

        if (!user) return jsonError('Erro ao criar usuário', 500);

        const { error: enrollError } = await supabase
            .from('enrollments')
            .upsert({
                user_id: user.id,
                product_id: id,
                status: 'active'
            }, {
                onConflict: 'user_id, product_id'
            });

        if (enrollError) return jsonError(`Erro ao liberar acesso: ${enrollError.message}`, 500);

        return jsonSuccess({
            message: `Acesso ao produto "${product.name}" concedido com sucesso para ${normalizedEmail}!`,
            user_id: user.id
        });
    } catch {
        return jsonError('Erro interno', 500);
    }
}
