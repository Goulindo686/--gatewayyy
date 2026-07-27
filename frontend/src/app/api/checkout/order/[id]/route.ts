import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { jsonError, jsonSuccess } from '@/lib/auth';
import { sendPaidOrderToUtmify } from '@/lib/utmify';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const { data: order } = await supabase
        .from('orders')
        .select(`
            id, status, amount, amount_display, payment_method, 
            pix_qr_code, pix_qr_code_url, pix_expires_at, 
            card_last_digits, card_brand, installments,
            created_at
        `)
        .eq('id', id)
        .single();

    if (!order) return jsonError('Pedido não encontrado', 404);

    const response: any = {
        order: {
            ...order,
            amount_display: order.amount_display || (order.amount / 100).toFixed(2)
        }
    };

    // Sincroniza integrações sem criar conta nem emitir sessão para o comprador.
    if (order.status === 'paid') {
        try {
            const { data: fullOrder } = await supabase
                .from('orders')
                .select('*')
                .eq('id', order.id)
                .single();
            await sendPaidOrderToUtmify(fullOrder || order);
        } catch (utmifyErr) {
            console.error('[UTMIFY] Checkout status sync error:', utmifyErr);
        }

    }

    return jsonSuccess(response);
}
