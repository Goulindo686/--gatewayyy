import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

const allowedOrigin = process.env.API_ALLOWED_ORIGIN || '*';
const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
};

const jsonResponse = (data: any, status = 200) =>
    NextResponse.json(data, { status, headers: corsHeaders });

const jsonError = (message: string, status = 400) =>
    NextResponse.json({ error: message, status: 'error' }, { status, headers: corsHeaders });

export async function OPTIONS() {
    return NextResponse.json({}, { status: 200, headers: corsHeaders });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const lookupId = String(id || '').trim();

        const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
        if (!apiKey) return jsonError('Chave de API não fornecida (Header: x-api-key)', 401);

        const { data: keyRecord, error: keyError } = await supabase
            .from('api_keys')
            .select('user_id, is_active')
            .eq('api_key', apiKey)
            .single();

        if (keyError || !keyRecord) return jsonError('Chave de API inválida', 401);
        if (!keyRecord.is_active) return jsonError('Chave de API inativa', 403);

        let transaction: any = null;
        let order: any = null;

        console.log(`[API v1 Status] Lookup ID: ${lookupId}, User ID: ${keyRecord.user_id}`);

        // 1. Try to find in Orders table (Preferred)
        {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .or(`id.eq.${lookupId},pagarme_order_id.eq.${lookupId}`)
                .eq('seller_id', keyRecord.user_id)
                .single();

            if (data) {
                order = data;
                console.log(`[API v1 Status] Found in Orders: ${order.id}`);
            }
        }

        if (order) {
            const normalizedStatus = order.status === 'paid' ? 'paid' : order.status;
            return jsonResponse({
                success: true,
                transaction_id: order.id,
                status: normalizedStatus,
                raw_status: order.status,
                amount: order.amount,
                payment_method: order.payment_method,
                pagarme_id: order.pagarme_order_id,
                description: 'Venda via API',
                customer: {
                    name: order.buyer_name,
                    email: order.buyer_email,
                },
                created_at: order.created_at,
                pix: {
                    qr_code: order.pix_qr_code,
                    qr_code_url: order.pix_qr_code_url,
                    expires_at: order.pix_expires_at
                }
            });
        }

        // 2. Fallback: Try to find in Transactions table (Legacy/Backup)
        // Note: Transactions table does not have customer info or payment method in schema
        {
            const { data: tx, error: txError } = await supabase
                .from('transactions')
                .select('id, status, amount, description, created_at')
                .eq('id', lookupId)
                .eq('user_id', keyRecord.user_id)
                .eq('type', 'api_sale')
                .single();
            
            if (tx) {
                transaction = tx;
                console.log(`[API v1 Status] Found in Transactions: ${tx.id}`);
            }
        }

        if (!transaction) {
             console.error(`[API v1 Status] Not found in Orders or Transactions for ID: ${lookupId}`);
             return jsonError('Transação não encontrada', 404);
        }

        const normalizedStatus = transaction.status === 'confirmed' ? 'paid' : transaction.status;

        return jsonResponse({
            success: true,
            transaction_id: transaction.id,
            status: normalizedStatus,
            raw_status: transaction.status,
            amount: transaction.amount,
            payment_method: 'pix', // Assumed since this is pix endpoint
            pagarme_id: null,
            description: transaction.description,
            customer: {
                name: 'Cliente', // Not available in transactions table
                email: 'email@nao-disponivel.com', // Not available
            },
            created_at: transaction.created_at,
        });
    } catch (error: any) {
        return jsonError(error.message || 'Erro interno', 500);
    }
}
