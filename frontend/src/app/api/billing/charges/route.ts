export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import pagarmeApi, { PagarmeService } from '@/lib/pagarme';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
    try {
        const auth = await getAuthUser(req);
        if (!auth) return jsonError('Não autorizado', 401);

        const userId = auth.user.id;
        const url = new URL(req.url);
        const status = url.searchParams.get('status');
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = parseInt(url.searchParams.get('offset') || '0');

        let query = supabase
            .from('billings')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) {
            query = query.eq('status', status);
        }

        const { data: billings, error, count } = await query;

        if (error) {
            if (error.message?.includes('does not exist')) {
                return jsonSuccess({ billings: [], total: 0, limit, offset });
            }
            throw error;
        }

        const formattedBillings = billings.map((b: any) => ({
            ...b,
            amount_display: (b.amount / 100).toFixed(2),
            fee_display: (b.fee_amount / 100).toFixed(2),
            net_display: (b.net_amount / 100).toFixed(2)
        }));

        return jsonSuccess({
            billings: formattedBillings,
            total: count,
            limit,
            offset
        });
    } catch (error: any) {
        console.error('[BILLING CHARGES GET] Error:', error);
        return jsonError(error.message, 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await getAuthUser(req);
        if (!auth) return jsonError('Não autorizado', 401);

        const userId = auth.user.id;
        const { amount, description } = await req.json();

        // Validate amount
        if (!amount || amount <= 0) {
            return jsonError('Valor inválido.', 400);
        }

        // Convert to cents
        const amountCents = Math.round(amount * 100);

        // Get user data
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, name, email, role, status')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            return jsonError('Usuário não encontrado.', 404);
        }

        if (user.status === 'blocked') {
            return jsonError('Sua conta está bloqueada.', 403);
        }

        // Get user's recipient
        const { data: recipient } = await supabase
            .from('recipients')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .single();

        if (!recipient?.pagarme_recipient_id) {
            return jsonError('Você precisa configurar sua conta de recebimento primeiro nas configurações.', 400);
        }

        // Calculate fees - Admin doesn't pay fees
        const PLATFORM_FLAT_FEE = 200; // R$2,00
        let platformFeeAmount = 0;
        let sellerAmount = amountCents;

        if (user.role !== 'admin') {
            platformFeeAmount = Math.min(PLATFORM_FLAT_FEE, amountCents);
            sellerAmount = amountCents - platformFeeAmount;
        }

        // Determine fee percentage for PagarmeService
        let feePercentage = 2; // default
        try {
            const { data: settingsRow } = await supabase
                .from('platform_settings')
                .select('fee_percentage')
                .limit(1)
                .single();
            if (settingsRow?.fee_percentage !== undefined && settingsRow.fee_percentage >= 0) {
                feePercentage = settingsRow.fee_percentage;
            }
        } catch {}
        if (user.role === 'admin') feePercentage = 0;

        // Create order on Pagar.me - using same logic as checkout/pay
        let pagarmeOrder;
        try {
            const ipHeader = req.headers.get('x-forwarded-for') || '';
            const ip = ipHeader.split(',')[0].trim() || undefined;
            const sessionId = uuidv4();

            pagarmeOrder = await PagarmeService.createOrder({
                amount: amountCents,
                payment_method: 'pix',
                customer: {
                    name: user.name || 'Cliente',
                    email: user.email || 'cliente@example.com',
                    cpf: '00000000000',
                    phone: '11999999999'
                },
                seller_recipient_id: recipient.pagarme_recipient_id,
                platform_fee_percentage: feePercentage,
                ip,
                session_id: sessionId
            });
        } catch (pagarmeErr: any) {
            console.error('[BILLING] Pagar.me API Error:', pagarmeErr.response?.data || pagarmeErr.message);
            const errorBody = pagarmeErr.response?.data;
            const errorMsg = errorBody?.message ||
                (errorBody?.errors ? JSON.stringify(errorBody.errors) : pagarmeErr.message);
            return jsonError(`Erro na API de Pagamento: ${errorMsg}`, 400);
        }

        // Check for failed charge
        const charge = pagarmeOrder.charges?.[0];
        if (charge?.status === 'failed' || pagarmeOrder.status === 'failed') {
            console.error('[BILLING] Order failed:', JSON.stringify(pagarmeOrder, null, 2));
            return jsonError('Pagamento recusado pelo Pagar.me.', 400);
        }

        // Extract PIX data - same logic as checkout/pay
        const extractPix = (order: any) => {
            const ch = order?.charges?.[0];
            const lt = ch?.last_transaction;
            const candidates = [
                lt?.pix,
                lt,
                ch?.pix,
                order?.payments?.[0]?.pix,
                order?.payments?.[0],
            ].filter(Boolean);

            for (const c of candidates) {
                const qrCode = c?.qr_code || c?.qrCode;
                const qrCodeUrl = c?.qr_code_url || c?.qrCodeUrl;
                const expiresAt = c?.expires_at || c?.expiresAt;
                if (qrCode || qrCodeUrl) {
                    return { qr_code: qrCode, qr_code_url: qrCodeUrl, expires_at: expiresAt };
                }
            }
            return null;
        };

        let pixData = extractPix(pagarmeOrder);

        // Retry - exact same pattern as checkout/pay route
        if (!pixData) {
            console.log('[BILLING] PIX data not in initial response, fetching hydrated order...');
            try {
                const hydrated = await PagarmeService.getOrder(pagarmeOrder.id);
                pixData = extractPix(hydrated);
                if (pixData) pagarmeOrder = hydrated;
            } catch (e) {
                console.error('[BILLING] Hydration attempt 1 failed:', e);
            }
        }

        // Second retry with delay
        if (!pixData) {
            console.log('[BILLING] PIX data still missing, retry #2 after 2s...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            try {
                const hydrated2 = await PagarmeService.getOrder(pagarmeOrder.id);
                pixData = extractPix(hydrated2);
                if (pixData) pagarmeOrder = hydrated2;
            } catch (e) {
                console.error('[BILLING] Hydration attempt 2 failed:', e);
            }
        }

        // Third retry with longer delay
        if (!pixData) {
            console.log('[BILLING] PIX data still missing, retry #3 after 3s...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            try {
                const hydrated3 = await PagarmeService.getOrder(pagarmeOrder.id);
                console.log('[BILLING] Hydrated order #3 structure:', JSON.stringify(hydrated3, null, 2));
                pixData = extractPix(hydrated3);
                if (pixData) pagarmeOrder = hydrated3;
            } catch (e) {
                console.error('[BILLING] Hydration attempt 3 failed:', e);
            }
        }

        // If still no PIX data, save the billing anyway but return the pagarme order id so
        // the frontend can display a fallback message
        if (!pixData) {
            console.error('[BILLING] PIX data missing after 3 retries. Full response:', JSON.stringify(pagarmeOrder, null, 2));
        }

        // Save billing charge to database
        const billingData = {
            user_id: userId,
            amount: amountCents,
            fee_amount: platformFeeAmount,
            net_amount: sellerAmount,
            description: description || 'Cobrança',
            status: 'pending',
            pagarme_order_id: pagarmeOrder.id,
            pagarme_charge_id: charge?.id,
            pix_qr_code: pixData?.qr_code || null,
            pix_qr_code_url: pixData?.qr_code_url || null,
            pix_expires_at: pixData?.expires_at || null
        };

        const { data: billing, error: billingError } = await supabase
            .from('billings')
            .insert(billingData)
            .select()
            .single();

        if (billingError) {
             console.error('[BILLING CHARGES POST] DB Error:', billingError);
             return jsonError('Erro ao salvar cobrança no banco de dados.', 500);
        }

        return jsonSuccess({
            billing: {
                id: billing.id,
                amount: billing.amount,
                amount_display: (billing.amount / 100).toFixed(2),
                fee_amount: billing.fee_amount,
                fee_display: (billing.fee_amount / 100).toFixed(2),
                net_amount: billing.net_amount,
                net_display: (billing.net_amount / 100).toFixed(2),
                description: billing.description,
                status: billing.status,
                pix_qr_code: billing.pix_qr_code,
                pix_qr_code_url: billing.pix_qr_code_url,
                pix_expires_at: billing.pix_expires_at,
                created_at: billing.created_at
            }
        });
    } catch (error: any) {
        console.error('[BILLING CHARGES POST] Error:', error.response?.data || error.message);
        return jsonError(error.response?.data?.message || error.message || 'Erro ao processar cobrança', 500);
    }
}

