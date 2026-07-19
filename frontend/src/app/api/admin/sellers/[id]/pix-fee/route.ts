import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';

type PixFeeMode = 'default' | 'exempt' | 'fixed' | 'percentage';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const auth = await getAuthUser(req);
    if (!auth || auth.user.role !== 'admin') return jsonError('Não autorizado', 403);

    try {
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
            || req.headers.get('x-real-ip')
            || 'unknown';
        const rl = await checkRateLimit({
            key: `admin:sellers:pix_fee:${auth.user.id}:${ip}`,
            limit: 30,
            windowSecs: 3600,
            failOpen: true,
        });
        if (!rl.allowed) return rateLimitResponse(rl.resetAt);

        const { mode, value } = await req.json() as { mode?: PixFeeMode; value?: number };
        if (!mode || !['default', 'exempt', 'fixed', 'percentage'].includes(mode)) {
            return jsonError('Tipo de taxa Pix inválido');
        }

        const { data: seller, error: sellerError } = await supabase
            .from('users')
            .select('id, name')
            .eq('id', id)
            .eq('role', 'seller')
            .single();
        if (sellerError || !seller) return jsonError('Vendedor não encontrado', 404);

        if (mode === 'default') {
            const { error } = await supabase
                .from('seller_pix_fee_settings')
                .delete()
                .eq('seller_id', id);
            if (error) throw error;
            return jsonSuccess({
                message: `${seller.name} voltou a usar a taxa Pix padrão do site.`,
                pix_fee: null,
            });
        }

        const numericValue = Number(value);
        if (mode === 'fixed' && (!Number.isFinite(numericValue) || numericValue <= 0 || numericValue > 1_000_000)) {
            return jsonError('A taxa fixa deve ser maior que R$ 0,00 e menor ou igual a R$ 1.000.000,00');
        }
        if (mode === 'percentage' && (!Number.isFinite(numericValue) || numericValue <= 0 || numericValue > 100)) {
            return jsonError('A taxa percentual deve ser maior que 0% e menor ou igual a 100%');
        }

        const setting = {
            seller_id: id,
            fee_type: mode,
            fixed_fee_cents: mode === 'fixed' ? Math.round(numericValue * 100) : null,
            percentage: mode === 'percentage' ? numericValue : null,
            updated_by: auth.user.id,
            updated_at: new Date().toISOString(),
        };
        const { data, error } = await supabase
            .from('seller_pix_fee_settings')
            .upsert(setting, { onConflict: 'seller_id' })
            .select('seller_id, fee_type, fixed_fee_cents, percentage, updated_at')
            .single();
        if (error) throw error;

        const message = mode === 'exempt'
            ? `${seller.name} ficou isento da taxa da plataforma no Pix.`
            : `Taxa Pix individual de ${seller.name} atualizada.`;
        return jsonSuccess({ message, pix_fee: data });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error || '');
        console.error('[ADMIN PIX FEE] Update error:', message);
        if (message.includes('seller_pix_fee_settings')) {
            return jsonError('A migração de taxas Pix individuais ainda não foi aplicada no banco.', 503);
        }
        return jsonError('Erro ao atualizar a taxa Pix do vendedor', 500);
    }
}
