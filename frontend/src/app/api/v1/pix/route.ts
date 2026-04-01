import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { PagarmeService } from '@/lib/pagarme';
import { v4 as uuidv4 } from 'uuid';

// CORS restrito às origens configuradas (ou qualquer origem se não configurado)
const allowedOrigin = process.env.API_ALLOWED_ORIGIN || '*';
const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
};

// Rate limiter simples em memória: máx 20 req/min por API key
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(key: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(key);
    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(key, { count: 1, resetAt: now + 60_000 });
        return true;
    }
    if (entry.count >= 20) return false;
    entry.count++;
    return true;
}

const jsonResponse = (data: any, status = 200) => 
    NextResponse.json(data, { status, headers: corsHeaders });

const jsonError = (message: string, status = 400) => 
    NextResponse.json({ error: message, status: 'error' }, { status, headers: corsHeaders });

export async function OPTIONS() {
    return NextResponse.json({}, { status: 200, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
    try {
        // 1. Validate API Key
        const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
        
        if (!apiKey) {
            return jsonError('Chave de API não fornecida (Header: x-api-key)', 401);
        }

        // 2. Find User by API Key
        const { data: keyRecord, error: keyError } = await supabase
            .from('api_keys')
            .select('user_id, is_active')
            .eq('api_key', apiKey)
            .single();

        if (keyError || !keyRecord) {
            return jsonError('Chave de API inválida', 401);
        }

        if (!keyRecord.is_active) {
            return jsonError('Chave de API inativa', 403);
        }

        // Rate limit: 20 requisições por minuto por API key
        if (!checkRateLimit(apiKey)) {
            return jsonError('Limite de requisições excedido. Tente novamente em 1 minuto.', 429);
        }

        const userId = keyRecord.user_id;

        // 3. Get User's Pagar.me Recipient ID
        const { data: recipient, error: recipientError } = await supabase
            .from('recipients')
            .select('pagarme_recipient_id')
            .eq('user_id', userId)
            .single();

        if (recipientError || !recipient) {
            return jsonError('Sua conta não está configurada para receber pagamentos. Configure seus dados bancários no painel.', 400);
        }

        // 4. Parse Body
        const body = await req.json();
        const { amount, description, customer } = body;

        if (!amount || amount < 100) return jsonError('Valor inválido (mínimo 100 centavos)');
        if (!customer || !customer.name || !customer.email || !customer.cpf) {
            return jsonError('Dados do cliente incompletos (name, email, cpf são obrigatórios)');
        }

        // 5. Calculate Platform Fee
        let feePercentage = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '2');
        try {
            const { data: settingsRow } = await supabase
                .from('platform_settings')
                .select('fee_percentage')
                .limit(1)
                .single();
            if (settingsRow?.fee_percentage !== undefined) {
                feePercentage = settingsRow.fee_percentage;
            }
        } catch {}
        try {
            const { data: userRow } = await supabase
                .from('users')
                .select('role')
                .eq('id', userId)
                .single();
            if (userRow?.role === 'admin') {
                feePercentage = 0;
            }
        } catch {}

        // 6. Create Transaction on Pagar.me
        const orderData = {
            amount: amount,
            payment_method: 'pix',
            customer: {
                name: customer.name,
                email: customer.email,
                cpf: customer.cpf, // PagarmeService uses .cpf
                phone: customer.phone // PagarmeService uses .phone string
            },
            seller_recipient_id: recipient.pagarme_recipient_id,
            platform_fee_percentage: feePercentage
        };

        const pagarmeOrder = await PagarmeService.createOrder(orderData);

        // 7. Extract Pix Data
        const extractPix = (pagarmeOrder: any) => {
            const charge = pagarmeOrder?.charges?.[0];
            const lastTransaction = charge?.last_transaction;

            const candidates = [
                lastTransaction?.pix,
                lastTransaction,
                charge?.pix,
                pagarmeOrder?.payments?.[0]?.pix,
                pagarmeOrder?.payments?.[0],
                charge?.last_transaction,
                pagarmeOrder
            ].filter(Boolean);

            for (const c of candidates) {
                const qrCode = c?.qr_code || c?.qrCode;
                const qrCodeUrl = c?.qr_code_url || c?.qrCodeUrl;
                const expiresAt = c?.expires_at || c?.expiresAt;

                if (qrCode || qrCodeUrl) {
                    return { qr_code: qrCode, qr_code_url: qrCodeUrl, expires_at: expiresAt };
                }
            }

            return { qr_code: null, qr_code_url: null, expires_at: null };
        };

        const pixData = extractPix(pagarmeOrder);

        if (!pixData.qr_code) {
            console.error('Pagar.me Order Response (Missing QR):', JSON.stringify(pagarmeOrder, null, 2));
            // Tentar identificar o motivo na resposta
            const status = pagarmeOrder.status;
            const charges = pagarmeOrder.charges || [];
            const lastChargeStatus = charges[0]?.status;
            
            if (status === 'failed' || lastChargeStatus === 'failed') {
                const charge = charges[0];
                const transaction = charge?.last_transaction;
                const acquirerMsg = transaction?.acquirer_message || 'Transação recusada pelo gateway';
                const gatewayErrors = transaction?.gateway_response?.errors;
                const userMsg = gatewayErrors?.length
                    ? gatewayErrors.map((e: any) => e.message).join('; ')
                    : acquirerMsg;

                // Log interno com detalhes (nunca exposto ao cliente)
                console.error('Pagar.me Failed Order:', JSON.stringify({
                    status, charge_status: lastChargeStatus,
                    acquirer_message: transaction?.acquirer_message,
                    gateway_errors: gatewayErrors,
                    recipient_id: recipient.pagarme_recipient_id,
                    platform_id: process.env.PLATFORM_RECIPIENT_ID
                }, null, 2));

                throw new Error(`Pagamento recusado: ${userMsg}`);
            }
            
            throw new Error('O Pagar.me recebeu o pedido mas não retornou o QR Code Pix. Verifique os logs.');
        }

        // 8. Save Transaction Record
        // We save it as 'api_sale' type, but now we also create an Order to ensure consistency
        const orderId = uuidv4();
        const transactionId = uuidv4();

        // 8.1 Create Order
        const orderPayload: any = {
            id: orderId,
            seller_id: userId,
            // product_id omitido pois é API Sale
            buyer_name: customer.name,
            buyer_email: customer.email,
            buyer_cpf: customer.cpf,
            buyer_phone: customer.phone,
            amount: amount,
            payment_method: 'pix',
            status: 'pending',
            pagarme_order_id: pagarmeOrder.id,
            pagarme_charge_id: pagarmeOrder.charges?.[0]?.id,
            pix_qr_code: pixData.qr_code,
            pix_qr_code_url: pixData.qr_code_url,
            pix_expires_at: pixData.expires_at
        };

        console.log('Inserting Order:', JSON.stringify(orderPayload, null, 2));

        const { error: orderError } = await supabase.from('orders').insert(orderPayload);

        if (orderError) {
            console.error('CRITICAL ERROR: Failed to save API order:', orderError);
            return jsonError(`Erro interno ao salvar pedido: ${orderError.message} (Code: ${orderError.code})`, 500);
        }

        // 8.2 Create Transaction
        const { error: insertError } = await supabase.from('transactions').insert({
            id: transactionId,
            user_id: userId,
            order_id: orderId,
            amount: amount,
            status: 'pending',
            type: 'api_sale',
            description: description || 'Venda via API'
        });

        if (insertError) {
            console.error('CRITICAL ERROR: Failed to save API transaction:', insertError);
            console.error('Transaction details:', { orderId, userId, amount, pagarme_id: pagarmeOrder.id });
            return jsonError(`Erro interno ao salvar transação: ${insertError.message}`, 500);
        }

        return jsonResponse({
            success: true,
            transaction_id: orderId, // Return Order ID as the main ID for status lookup
            pix: {
                qr_code: pixData.qr_code,
                qr_code_url: pixData.qr_code_url,
                expires_at: pixData.expires_at
            },
            amount: amount,
            status: 'pending'
        });

    } catch (error: any) {
        console.error('API Pix Error:', error);
        
        if (error.response?.data) {
            console.error('Pagar.me raw error:', JSON.stringify(error.response.data, null, 2));
            const msg = error.response.data?.message || 'Erro no processamento do pagamento';
            return jsonError(msg, error.response.status || 400);
        }

        return jsonError(error.message || 'Erro interno ao processar pagamento', 500);
    }
}
