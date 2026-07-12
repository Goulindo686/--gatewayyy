import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { jsonError, jsonSuccess, generateToken, hashPassword } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { sendPaidOrderToUtmify } from '@/lib/utmify';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const { data: order } = await supabase
        .from('orders')
        .select(`
            id, status, amount, amount_display, payment_method, 
            pix_qr_code, pix_qr_code_url, pix_expires_at, 
            card_last_digits, card_brand, installments,
            created_at, buyer_email, buyer_name, product_id
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

    // If payment just confirmed (PIX), handle auto-enrollment and return auth token
    if (order.status === 'paid' && order.buyer_email) {
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

        // Find or create buyer user
        let buyerUser: any = null;
        const { data: existingUser } = await supabase
            .from('users')
            .select('id, name, email, role')
            .ilike('email', order.buyer_email.toLowerCase().trim())
            .single();

        if (existingUser) {
            buyerUser = existingUser;
        } else {
            const newUserId = uuidv4();
            const tempPassword = uuidv4().substring(0, 12);
            const hashedPw = await hashPassword(tempPassword);
            const baseUserData: any = {
                id: newUserId,
                email: order.buyer_email.toLowerCase().trim(),
                name: order.buyer_name || 'Estudante',
                role: 'customer',
                status: 'active'
            };

            let newUser: any = null;
            let createErr: any = null;

            ({ data: newUser, error: createErr } = await supabase
                .from('users')
                .insert({ ...baseUserData, password_hash: hashedPw })
                .select('id, name, email, role')
                .single());

            if (createErr && /password_hash/i.test(createErr.message || '')) {
                ({ data: newUser, error: createErr } = await supabase
                    .from('users')
                    .insert({ ...baseUserData, password: hashedPw })
                    .select('id, name, email, role')
                    .single());
            }

            if (!createErr && newUser) buyerUser = newUser;
        }

        if (buyerUser && order.product_id) {
            // Ensure enrollment exists
            await supabase.from('enrollments').upsert({
                user_id: buyerUser.id,
                product_id: order.product_id,
                order_id: order.id,
                status: 'active'
            }, { onConflict: 'user_id, product_id' });

            // Return auth token so the frontend can auto-login
            const token = generateToken({ id: buyerUser.id, email: buyerUser.email, role: buyerUser.role });
            response.auth = {
                token,
                user: { id: buyerUser.id, name: buyerUser.name, email: buyerUser.email, role: buyerUser.role }
            };
        }
    }

    return jsonSuccess(response);
}
