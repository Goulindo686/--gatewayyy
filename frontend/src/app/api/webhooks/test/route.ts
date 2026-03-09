import { NextRequest } from 'next/server';
import { getAuthUser, jsonSuccess, jsonError } from '@/lib/auth';
import { supabase } from '@/lib/db';

export async function POST(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Unauthorized', 401);

    const { data: user } = await supabase.from('users').select('webhook_url').eq('id', auth.user.id).single();

    if (!user?.webhook_url) {
        return jsonError('Nenhuma URL de Webhook configurada.', 400);
    }

    const payload = {
        event: 'test.notification',
        data: {
            id: 'test_transaction_123',
            status: 'paid',
            amount: 1000,
            amount_display: '10.00',
            description: 'Venda de Teste - Verificação de Webhook',
            payment_method: 'pix',
            customer: {
                name: 'Cliente de Teste',
                email: 'teste@exemplo.com',
                cpf: '000.000.000-00'
            },
            created_at: new Date().toISOString()
        }
    };

    try {
        const startTime = Date.now();
        const response = await fetch(user.webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const duration = Date.now() - startTime;

        if (response.ok) {
            return jsonSuccess({ 
                success: true, 
                status: response.status, 
                duration: `${duration}ms`,
                message: 'Webhook enviado com sucesso!' 
            });
        } else {
            const text = await response.text().catch(() => '');
            return jsonError(`O servidor retornou erro ${response.status}: ${text.slice(0, 100)}`, 400);
        }
    } catch (error: any) {
        return jsonError(`Erro de conexão: ${error.message}`, 500);
    }
}