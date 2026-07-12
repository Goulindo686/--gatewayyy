import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { sendAccountBlockedEmail } from '@/lib/email';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const auth = await getAuthUser(req);
    if (!auth || auth.user.role !== 'admin') return jsonError('Não autorizado', 403);

    try {
        const ip =
            req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
            req.headers.get('x-real-ip') ||
            'unknown';
        const rl = await checkRateLimit({ key: `admin:sellers:block:${auth.user.id}:${ip}`, limit: 30, windowSecs: 60, failOpen: true });
        if (!rl.allowed) return rateLimitResponse(rl.resetAt);

        const { blocked } = await req.json();
        const newStatus = blocked ? 'blocked' : 'active';

        const { data: seller, error: sellerError } = await supabase
            .from('users')
            .select('id, name, email, status')
            .eq('id', id)
            .eq('role', 'seller')
            .single();

        if (sellerError || !seller) return jsonError('Vendedor não encontrado', 404);

        const { error } = await supabase
            .from('users').update({ status: newStatus }).eq('id', id).eq('role', 'seller');

        if (error) return jsonError('Erro ao atualizar vendedor');

        if (blocked && seller.status !== 'blocked' && seller.email) {
            try {
                await sendAccountBlockedEmail({
                    toEmail: seller.email,
                    userName: seller.name,
                });
            } catch (emailError: unknown) {
                const message = emailError instanceof Error ? emailError.message : emailError;
                console.error('[EMAIL] Erro ao enviar aviso de bloqueio de conta:', message);
            }
        }

        return jsonSuccess({ message: `Vendedor ${blocked ? 'bloqueado' : 'desbloqueado'}` });
    } catch {
        return jsonError('Erro interno', 500);
    }
}
