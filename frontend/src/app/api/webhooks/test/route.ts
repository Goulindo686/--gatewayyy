import { NextRequest } from 'next/server';
import { getAuthUser, jsonSuccess, jsonError } from '@/lib/auth';
import { supabase } from '@/lib/db';
import { normalizeWebhookUrls, sendWebhookPayload } from '@/lib/webhooks';

export async function POST(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Unauthorized', 401);

    const { data: user } = await supabase.from('users').select('webhook_url, webhook_urls').eq('id', auth.user.id).single();
    const webhookUrls = normalizeWebhookUrls(user?.webhook_urls, user?.webhook_url);

    if (webhookUrls.length === 0) {
        return jsonError('Nenhuma URL de Webhook configurada.', 400);
    }

    const payload = {
        event: 'test.notification',
        id: 'test_transaction_123', // Alguns sistemas buscam ID na raiz
        data: {
            id: 'test_transaction_123',
            transaction_id: 'test_transaction_123', // Compatibilidade extra
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
        const results = await Promise.all(webhookUrls.map((url) => sendWebhookPayload(url, payload)));
        const failures = results.filter((result) => !result.ok);

        if (failures.length === 0) {
            return jsonSuccess({ 
                success: true, 
                results,
                message: webhookUrls.length === 1 ? 'Webhook enviado com sucesso!' : `${webhookUrls.length} webhooks enviados com sucesso!`
            });
        } else {
            return jsonError(`${failures.length} webhook(s) retornaram erro. Primeiro erro: ${failures[0].status} ${failures[0].error || ''}`, 400);
        }
    } catch (error: any) {
        return jsonError(`Erro de conexão: ${error.message}`, 500);
    }
}
