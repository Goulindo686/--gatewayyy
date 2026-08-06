import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { jsonError, jsonSuccess } from '@/lib/auth';
import { sendPaidOrderToUtmify } from '@/lib/utmify';
import { reconcileOrderPayment } from '@/lib/order-payment-reconciliation';
import { getUniqueDeliveryPurchaseKeys } from '@/lib/unique-deliveries';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    let reconciliation;
    try {
        reconciliation = await reconcileOrderPayment(id);
    } catch (error) {
        console.error('[CHECKOUT STATUS] Provider reconciliation failed:', error);
    }

    const fullOrder = reconciliation?.order || null;
    const { data: order } = fullOrder
        ? { data: fullOrder }
        : await supabase
            .from('orders')
            .select('*')
            .eq('id', id)
            .maybeSingle();

    if (!order) return jsonError('Pedido não encontrado', 404);

    let hasUniqueDelivery = false;
    if (order.status === 'paid') {
        try {
            const uniquePurchaseKeys = await getUniqueDeliveryPurchaseKeys([order.id]);
            hasUniqueDelivery = Array.from(uniquePurchaseKeys).some((key) => (
                key.startsWith(`${order.id}:`)
            ));
        } catch (error) {
            console.error('[CHECKOUT STATUS] Failed to resolve delivery destination:', error);
        }
    }

    const response: any = {
        order: {
            id: order.id,
            status: order.status,
            amount: order.amount,
            amount_display: order.amount_display || (order.amount / 100).toFixed(2),
            payment_method: order.payment_method,
            pix_qr_code: order.pix_qr_code,
            pix_qr_code_url: order.pix_qr_code_url,
            pix_expires_at: order.pix_expires_at,
            card_last_digits: order.card_last_digits,
            card_brand: order.card_brand,
            installments: order.installments,
            created_at: order.created_at,
            has_unique_delivery: hasUniqueDelivery,
        }
    };

    // Sincroniza integrações sem criar conta nem emitir sessão para o comprador.
    if (order.status === 'paid') {
        try {
            await sendPaidOrderToUtmify(order);
        } catch (utmifyErr) {
            console.error('[UTMIFY] Checkout status sync error:', utmifyErr);
        }

    }

    return jsonSuccess(response);
}
