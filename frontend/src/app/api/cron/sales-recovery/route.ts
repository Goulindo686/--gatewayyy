import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { sendPixSalesRecoveryEmail } from '@/lib/email';
import { reconcileOrderPayment } from '@/lib/order-payment-reconciliation';
import { ensureRecipientManualPayoutControl } from '@/lib/affiliates';

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

    const payoutControlSummary = {
        checked: 0,
        disabled: 0,
        failed: 0,
    };
    const payoutControlErrors: string[] = [];
    const { data: uncontrolledRecipients, error: payoutControlLoadError } = await supabase
        .from('recipients')
        .select('user_id, pagarme_recipient_id')
        .is('affiliate_payout_controlled_at', null)
        .not('pagarme_recipient_id', 'is', null)
        // Os ainda nao tentados passam antes dos erros antigos, evitando que
        // um recebedor invalido bloqueie a regularizacao dos demais.
        .order('affiliate_payout_control_error', { ascending: true, nullsFirst: true })
        .limit(25);

    if (payoutControlLoadError) {
        console.error('[PAYOUT CONTROL CRON] Failed to load recipients:', payoutControlLoadError);
        payoutControlErrors.push(payoutControlLoadError.message);
    } else {
        const payoutQueue = [...(uncontrolledRecipients || [])];
        const payoutWorkers = Array.from({ length: Math.min(5, payoutQueue.length) }, async () => {
            while (payoutQueue.length > 0) {
                const recipient = payoutQueue.shift();
                if (!recipient?.user_id || !recipient.pagarme_recipient_id) continue;
                payoutControlSummary.checked++;
                try {
                    await ensureRecipientManualPayoutControl(
                        recipient.user_id,
                        recipient.pagarme_recipient_id,
                    );
                    payoutControlSummary.disabled++;
                } catch (error) {
                    payoutControlSummary.failed++;
                    payoutControlErrors.push(errorMessage(error));
                }
            }
        });
        await Promise.all(payoutWorkers);
    }

    const reconciliationSummary = {
        checked: 0,
        paid: 0,
        terminal: 0,
        failed: 0,
    };
    const reconciliationErrors: string[] = [];
    const createdAfter = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [pendingResult, unfinishedPaidResult] = await Promise.all([
        supabase
            .from('orders')
            .select('id')
            .in('status', ['pending', 'processing'])
            .gte('created_at', createdAfter)
            .not('pagarme_order_id', 'is', null)
            .order('created_at', { ascending: false })
            .limit(100),
        supabase
            .from('orders')
            .select('id')
            .eq('status', 'paid')
            .is('paid_processed_at', null)
            .gte('created_at', createdAfter)
            .order('created_at', { ascending: false })
            .limit(50),
    ]);

    if (pendingResult.error || unfinishedPaidResult.error) {
        const loadError = pendingResult.error || unfinishedPaidResult.error;
        console.error('[PAYMENT RECONCILIATION CRON] Failed to load orders:', loadError);
        reconciliationErrors.push(loadError?.message || 'Falha ao consultar pedidos');
    } else {
        const uniqueOrders = new Map(
            [...(pendingResult.data || []), ...(unfinishedPaidResult.data || [])]
                .map((order) => [order.id, order]),
        );
        const queue = [...uniqueOrders.values()];
        const workers = Array.from({ length: Math.min(5, queue.length) }, async () => {
            while (queue.length > 0) {
                const order = queue.shift();
                if (!order) break;
                reconciliationSummary.checked++;
                try {
                    const result = await reconcileOrderPayment(order.id);
                    if (result.status === 'paid') reconciliationSummary.paid++;
                    else if (!['unchanged', 'not_found'].includes(result.status)) {
                        reconciliationSummary.terminal++;
                    }
                } catch (error) {
                    reconciliationSummary.failed++;
                    reconciliationErrors.push(`${order.id}: ${errorMessage(error)}`);
                }
            }
        });
        await Promise.all(workers);
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
    const nowIso = now.toISOString();
    const summary = {
        settings_checked: settings?.length || 0,
        candidates_checked: 0,
        already_sent: 0,
        invalid_order_data: 0,
        expired: 0,
        failed: 0,
    };

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
            .not('buyer_email', 'is', null)
            .neq('buyer_email', '')
            .not('pix_qr_code', 'is', null)
            .neq('pix_qr_code', '')
            .or(`pix_expires_at.is.null,pix_expires_at.gt.${nowIso}`)
            .order('created_at', { ascending: false })
            .limit(250);

        if (ordersError) {
            errors.push(ordersError.message);
            continue;
        }

        for (const order of orders || []) {
            summary.candidates_checked++;

            if (!order.buyer_email || !order.pix_qr_code) {
                summary.invalid_order_data++;
                skipped++;
                continue;
            }

            if (order.pix_expires_at && new Date(order.pix_expires_at) <= now) {
                summary.expired++;
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
                    summary.already_sent++;
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
                summary.failed++;
                await supabase.from('sales_recovery_emails').delete().eq('order_id', order.id);
                errors.push(`${order.id}: ${errorMessage(error)}`);
            }
        }
    }

    return NextResponse.json({
        success: true,
        sent,
        skipped,
        summary,
        reconciliation: reconciliationSummary,
        payout_control: payoutControlSummary,
        errors: [...payoutControlErrors, ...reconciliationErrors, ...errors].slice(0, 10),
    });
}

export async function POST(req: NextRequest) {
    return GET(req);
}
