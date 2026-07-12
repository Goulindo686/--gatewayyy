import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { sendPixSalesRecoveryEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

function errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}

export async function GET(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) return NextResponse.json({ error: 'CRON_SECRET nao configurado' }, { status: 500 });
    if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    }

    const { data: settings, error: settingsError } = await supabase
        .from('sales_recovery_settings')
        .select('user_id, product_id, delay_minutes, products(name)')
        .eq('enabled', true);

    if (settingsError) {
        console.error('[SALES RECOVERY CRON] Failed to load settings:', settingsError);
        return NextResponse.json({ error: settingsError.message }, { status: 500 });
    }

    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];
    const now = new Date();

    for (const setting of settings || []) {
        const createdBefore = new Date(now.getTime() - setting.delay_minutes * 60_000).toISOString();
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('id, buyer_name, buyer_email, amount, amount_display, pix_qr_code, pix_qr_code_url, pix_expires_at, created_at')
            .eq('seller_id', setting.user_id)
            .eq('product_id', setting.product_id)
            .eq('payment_method', 'pix')
            .eq('status', 'pending')
            .lte('created_at', createdBefore)
            .order('created_at', { ascending: true })
            .limit(100);

        if (ordersError) {
            errors.push(ordersError.message);
            continue;
        }

        for (const order of orders || []) {
            if (!order.buyer_email || !order.pix_qr_code) {
                skipped++;
                continue;
            }

            if (order.pix_expires_at && new Date(order.pix_expires_at) <= now) {
                skipped++;
                continue;
            }

            try {
                const { error: reserveError } = await supabase.from('sales_recovery_emails').insert({
                    order_id: order.id,
                    user_id: setting.user_id,
                    product_id: setting.product_id,
                    buyer_email: order.buyer_email,
                });

                if (reserveError?.code === '23505') {
                    skipped++;
                    continue;
                }
                if (reserveError) throw reserveError;

                const product = Array.isArray(setting.products) ? setting.products[0] : setting.products;
                await sendPixSalesRecoveryEmail({
                    buyerName: order.buyer_name,
                    buyerEmail: order.buyer_email,
                    productName: product?.name || 'Seu produto',
                    amount: order.amount_display || (order.amount / 100).toFixed(2),
                    orderId: order.id,
                    pixQrCode: order.pix_qr_code,
                    pixQrCodeUrl: order.pix_qr_code_url,
                    pixExpiresAt: order.pix_expires_at,
                });

                sent++;
            } catch (error: unknown) {
                await supabase.from('sales_recovery_emails').delete().eq('order_id', order.id);
                errors.push(`${order.id}: ${errorMessage(error)}`);
            }
        }
    }

    return NextResponse.json({ success: true, sent, skipped, errors: errors.slice(0, 10) });
}

export async function POST(req: NextRequest) {
    return GET(req);
}
