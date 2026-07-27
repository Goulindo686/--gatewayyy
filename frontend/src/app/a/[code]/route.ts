import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import {
    affiliateCookieName,
    createAffiliateToken,
    hashAffiliateValue,
    safeAffiliateDestination,
} from '@/lib/affiliates';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ code: string }> },
) {
    const { code } = await context.params;
    const normalizedCode = String(code || '').trim();
    if (!/^[a-zA-Z0-9_-]{8,64}$/.test(normalizedCode)) {
        return NextResponse.redirect(new URL('/', req.url));
    }
    const requestIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
        || req.headers.get('x-real-ip')
        || 'unknown';
    const rateLimit = await checkRateLimit({
        key: `affiliate:click:${normalizedCode}:${requestIp}`,
        limit: 120,
        windowSecs: 60,
        failOpen: true,
    });
    if (!rateLimit.allowed) return NextResponse.redirect(new URL('/', req.url));

    const { data: link } = await supabase
        .from('affiliate_links')
        .select('id, affiliation_id, destination_path, is_active')
        .eq('code', normalizedCode)
        .eq('is_active', true)
        .maybeSingle();
    if (!link) return NextResponse.redirect(new URL('/', req.url));

    const { data: affiliation } = await supabase
        .from('affiliate_affiliations')
        .select('id, program_id, affiliate_id, status')
        .eq('id', link.affiliation_id)
        .eq('status', 'approved')
        .maybeSingle();
    if (!affiliation) return NextResponse.redirect(new URL('/', req.url));

    const { data: program } = await supabase
        .from('affiliate_programs')
        .select('id, product_id, producer_id, status, attribution_model, cookie_days')
        .eq('id', affiliation.program_id)
        .eq('status', 'active')
        .maybeSingle();
    if (!program || program.producer_id === affiliation.affiliate_id) {
        return NextResponse.redirect(new URL('/', req.url));
    }
    const { data: product } = await supabase
        .from('products')
        .select('id')
        .eq('id', program.product_id)
        .eq('user_id', program.producer_id)
        .eq('status', 'active')
        .maybeSingle();
    if (!product) return NextResponse.redirect(new URL('/', req.url));

    const destinationPath = safeAffiliateDestination(link.destination_path, program.product_id);
    const destination = new URL(destinationPath, req.url);
    const cookieName = affiliateCookieName(program.product_id);
    const currentToken = req.cookies.get(cookieName)?.value;

    if (program.attribution_model === 'first_click' && currentToken) {
        const { data: currentClick } = await supabase
            .from('affiliate_clicks')
            .select('id, affiliation_id, link_id')
            .eq('token_hash', hashAffiliateValue(currentToken))
            .eq('program_id', program.id)
            .eq('product_id', program.product_id)
            .gt('expires_at', new Date().toISOString())
            .maybeSingle();
        if (currentClick) {
            const [{ data: currentAffiliation }, { data: currentLink }] = await Promise.all([
                supabase
                    .from('affiliate_affiliations')
                    .select('status')
                    .eq('id', currentClick.affiliation_id)
                    .eq('status', 'approved')
                    .maybeSingle(),
                supabase
                    .from('affiliate_links')
                    .select('is_active')
                    .eq('id', currentClick.link_id)
                    .eq('is_active', true)
                    .maybeSingle(),
            ]);
            if (currentAffiliation && currentLink) {
                return NextResponse.redirect(destination);
            }
        }
    }

    const token = createAffiliateToken();
    const now = new Date();
    const cookieDays = Math.max(1, Math.min(365, Math.trunc(program.cookie_days || 60)));
    const expiresAt = new Date(now);
    expiresAt.setUTCDate(expiresAt.getUTCDate() + cookieDays);
    const ip = requestIp === 'unknown' ? '' : requestIp;
    const salt = process.env.JWT_SECRET || 'affiliate-attribution';

    const { error } = await supabase.from('affiliate_clicks').insert({
        link_id: link.id,
        program_id: program.id,
        affiliation_id: affiliation.id,
        affiliate_id: affiliation.affiliate_id,
        product_id: program.product_id,
        token_hash: hashAffiliateValue(token),
        landing_path: destinationPath,
        referrer: req.headers.get('referer')?.slice(0, 1000) || null,
        ip_hash: ip ? hashAffiliateValue(`${salt}:ip:${ip}`) : null,
        user_agent_hash: req.headers.get('user-agent')
            ? hashAffiliateValue(`${salt}:ua:${req.headers.get('user-agent')}`)
            : null,
        expires_at: expiresAt.toISOString(),
    });
    if (error) {
        console.error('[AFFILIATES] Failed to record click:', error);
        return new NextResponse(
            'Nao foi possivel registrar o link de afiliado agora. Tente novamente em alguns instantes.',
            { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } },
        );
    }

    const response = NextResponse.redirect(destination);
    response.cookies.set({
        name: cookieName,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        expires: expiresAt,
        maxAge: cookieDays * 24 * 60 * 60,
    });
    return response;
}
