export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { decryptUtmifyToken, retryUtmifyEvent } from '@/lib/utmify';

export async function GET(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) return NextResponse.json({ error: 'CRON_SECRET nao configurado' }, { status: 500 });
    if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    }

    const now = new Date().toISOString();
    const { data: events, error } = await supabase
        .from('utmify_events')
        .select('*')
        .eq('status', 'failed')
        .lte('next_retry_at', now)
        .lt('attempt_count', 5)
        .order('next_retry_at', { ascending: true })
        .limit(50);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let retried = 0;
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const event of events || []) {
        try {
            const { data: seller } = await supabase
                .from('users')
                .select('utmify_enabled, utmify_api_token')
                .eq('id', event.seller_id)
                .single();

            const token = decryptUtmifyToken(seller?.utmify_api_token);
            if (!seller?.utmify_enabled || !token) {
                failed++;
                continue;
            }

            retried++;
            const result = await retryUtmifyEvent(event, token);
            if ((result as any).ok) sent++;
            else failed++;
        } catch (err: any) {
            failed++;
            errors.push(err?.message || 'Erro desconhecido');
        }
    }

    return NextResponse.json({ retried, sent, failed, errors });
}
