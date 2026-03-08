import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { PagarmeService } from '@/lib/pagarme';
import { v4 as uuidv4 } from 'uuid';

// Helper for error responses
const jsonError = (message: string, status = 400) => 
    NextResponse.json({ error: message, status: 'error' }, { status });

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

        // 6. Create Transaction on Pagar.me
        // PagarmeService.createOrder expects specific structure
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
        const extractPix = (order: any) => {
            const charge = order?.charges?.[0];
            const lastTransaction = charge?.last_transaction;
            
            const candidates = [
                lastTransaction?.qr_code,
                lastTransaction?.qrCode,
                charge?.last_transaction?.qr_code_url,
                order?.qr_code
            ].filter(Boolean);

            // Try to find QR Code and URL
            // Pagar.me response structure varies
            let qrCode = charge?.last_transaction?.qr_code || charge?.last_transaction?.qrCode;
            let qrCodeUrl = charge?.last_transaction?.qr_code_url || charge?.last_transaction?.qrCodeUrl;

            return { qr_code: qrCode, qr_code_url: qrCodeUrl };
        };

        const pixData = extractPix(pagarmeOrder);

        // 8. Save Transaction Record (Optional but recommended)
        // We save it as 'api_sale' type
        const orderId = uuidv4();
        await supabase.from('transactions').insert({
            id: orderId,
            user_id: userId,
            amount: amount,
            status: 'pending',
            type: 'api_sale',
            description: description || 'Venda via API',
            payment_method: 'pix',
            pagarme_id: pagarmeOrder.id,
            customer_email: customer.email,
            customer_name: customer.name
        });

        return NextResponse.json({
            success: true,
            transaction_id: orderId,
            pix: {
                qr_code: pixData.qr_code,
                qr_code_url: pixData.qr_code_url,
                expires_at: pagarmeOrder.charges?.[0]?.last_transaction?.expires_at
            },
            amount: amount,
            status: 'pending'
        });

    } catch (error: any) {
        console.error('API Pix Error:', error);
        return jsonError(error.message || 'Erro interno ao processar pagamento', 500);
    }
}
