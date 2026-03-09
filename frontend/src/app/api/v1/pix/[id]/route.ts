import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

        {
            const { data: tx } = await supabase
                .from('transactions')
                .select('id, status, amount, description, payment_method, pagarme_id, customer_name, customer_email, created_at')
                .eq('id', lookupId)
                .eq('user_id', keyRecord.user_id)
                .eq('type', 'api_sale')
                .single();
            if (tx) transaction = tx;
        }

        if (!transaction) {
            const { data: tx } = await supabase
                .from('transactions')
                .select('id, status, amount, description, payment_method, pagarme_id, customer_name, customer_email, created_at')
                .eq('pagarme_id', lookupId)
                .eq('user_id', keyRecord.user_id)
                .eq('type', 'api_sale')
                .single();
            if (tx) transaction = tx;
        }

        if (!transaction) return jsonError('Transação não encontrada', 404);

        const normalizedStatus = transaction.status === 'confirmed' ? 'paid' : transaction.status;

        return jsonResponse({
            success: true,
            transaction_id: transaction.id,
            status: normalizedStatus,
            raw_status: transaction.status,
            amount: transaction.amount,
            payment_method: transaction.payment_method,
            pagarme_id: transaction.pagarme_id,
            description: transaction.description,
            customer: {
                name: transaction.customer_name,
                email: transaction.customer_email,
            },
            created_at: transaction.created_at,
        });
    } catch (error: any) {
        return jsonError(error.message || 'Erro interno', 500);
    }
}
