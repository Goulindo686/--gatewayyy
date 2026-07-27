import { NextRequest } from 'next/server';
import { jsonError, jsonSuccess } from '@/lib/auth';
import { supabase } from '@/lib/db';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ code: string }> },
) {
    const { code } = await context.params;
    const inviteCode = String(code || '').trim();
    if (!/^[a-zA-Z0-9_-]{8,64}$/.test(inviteCode)) {
        return jsonError('Convite invalido.', 400);
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
        || req.headers.get('x-real-ip')
        || 'unknown';
    const rateLimit = await checkRateLimit({
        key: `affiliate:invite:public:${inviteCode}:${ip}`,
        limit: 60,
        windowSecs: 60,
        failOpen: true,
    });
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetAt);

    const { data: program } = await supabase
        .from('affiliate_programs')
        .select('id, product_id, producer_id, status, commission_rate_bps, cookie_days, terms_text, invite_expires_at')
        .eq('invite_code', inviteCode)
        .eq('status', 'active')
        .maybeSingle();
    if (
        !program
        || (
            program.invite_expires_at
            && new Date(program.invite_expires_at).getTime() <= Date.now()
        )
    ) {
        return jsonError('Este convite expirou ou nao esta mais disponivel.', 404);
    }

    const [{ data: product }, { data: producer }] = await Promise.all([
        supabase
            .from('products')
            .select('id, name, description, image_url, price, status')
            .eq('id', program.product_id)
            .eq('user_id', program.producer_id)
            .eq('status', 'active')
            .maybeSingle(),
        supabase
            .from('users')
            .select('id, name, status')
            .eq('id', program.producer_id)
            .neq('status', 'blocked')
            .maybeSingle(),
    ]);
    if (!product || !producer) return jsonError('Este convite nao esta mais disponivel.', 404);

    return jsonSuccess({
        invitation: {
            product,
            producer: { id: producer.id, name: producer.name },
            commission_rate_bps: program.commission_rate_bps,
            cookie_days: program.cookie_days,
            terms_text: program.terms_text,
        },
    });
}
