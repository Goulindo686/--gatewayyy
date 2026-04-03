import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { jsonError, jsonSuccess, hashPassword, generateToken } from '@/lib/auth';
import { PagarmeService } from '@/lib/pagarme';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
    try {
        const { plan_id, customer, card, address } = await req.json();

        if (!plan_id || !customer?.name || !customer?.email || !customer?.cpf)
            return jsonError('Dados incompletos');
        if (!card?.number || !card?.holder_name || !card?.exp_month || !card?.exp_year || !card?.cvv)
            return jsonError('Dados do cartão incompletos');

        // Busca o plano
        const { data: plan } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('id', plan_id)
            .eq('status', 'active')
            .single();

        if (!plan) return jsonError('Plano não encontrado', 404);
        if (!plan.pagarme_plan_id) return jsonError('Plano não configurado no gateway', 400);

        // Busca recipient do vendedor
        const { data: recipient } = await supabase
            .from('recipients').select('pagarme_recipient_id').eq('user_id', plan.user_id).single();
        if (!recipient) return jsonError('Vendedor não configurado para receber', 400);

        // Taxa da plataforma
        let feePercentage = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '2');
        try {
            const { data: settings } = await supabase.from('platform_settings').select('fee_percentage').single();
            if (settings?.fee_percentage !== undefined) feePercentage = settings.fee_percentage;
        } catch {}

        // Cria assinatura no Pagar.me
        const pagarmeSub = await PagarmeService.createSubscription({
            plan_id: plan.pagarme_plan_id,
            customer,
            card,
            address,
            seller_recipient_id: recipient.pagarme_recipient_id,
            platform_fee_percentage: feePercentage,
            amount: plan.amount
        });

        if (pagarmeSub.status === 'canceled' || pagarmeSub.status === 'failed') {
            return jsonError('Assinatura recusada pelo gateway. Verifique os dados do cartão.', 400);
        }

        // Calcula próximo período
        const now = new Date();
        const periodEnd = new Date(now);
        if (plan.interval === 'month') periodEnd.setMonth(periodEnd.getMonth() + (plan.interval_count || 1));
        else if (plan.interval === 'week') periodEnd.setDate(periodEnd.getDate() + 7 * (plan.interval_count || 1));
        else if (plan.interval === 'year') periodEnd.setFullYear(periodEnd.getFullYear() + (plan.interval_count || 1));

        // Salva assinatura no banco
        const { data: subscription, error } = await supabase.from('subscriptions').insert({
            id: uuidv4(),
            seller_id: plan.user_id,
            subscription_plan_id: plan.id,
            pagarme_subscription_id: pagarmeSub.id,
            pagarme_plan_id: plan.pagarme_plan_id,
            customer_name: customer.name,
            customer_email: customer.email.toLowerCase().trim(),
            customer_cpf: customer.cpf.replace(/\D/g, ''),
            amount: plan.amount,
            status: pagarmeSub.status === 'active' ? 'active' : 'pending',
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString()
        }).select().single();

        if (error) return jsonError('Erro ao salvar assinatura: ' + error.message);

        // Criar ou encontrar conta do cliente e gerar token de login automático
        let buyerUser: any = null;
        const normalizedEmail = customer.email.toLowerCase().trim();

        const { data: existingUser } = await supabase
            .from('users')
            .select('id, name, email, role')
            .ilike('email', normalizedEmail)
            .single();

        if (existingUser) {
            buyerUser = existingUser;
        } else {
            const newUserId = uuidv4();
            const tempPassword = uuidv4().substring(0, 12);
            const hashedPw = await hashPassword(tempPassword);
            const { data: newUser } = await supabase
                .from('users')
                .insert({ id: newUserId, email: normalizedEmail, name: customer.name, role: 'customer', status: 'active', password_hash: hashedPw })
                .select('id, name, email, role')
                .single();
            if (newUser) buyerUser = newUser;
        }

        let authToken: string | null = null;
        if (buyerUser) {
            authToken = generateToken({ userId: buyerUser.id, role: buyerUser.role });
        }

        return jsonSuccess({
            subscription,
            pagarme_status: pagarmeSub.status,
            auth: buyerUser ? { token: authToken, user: { id: buyerUser.id, name: buyerUser.name, email: buyerUser.email, role: buyerUser.role } } : null
        }, 201);
    } catch (err: any) {
        const msg = err.response?.data?.message || err.message;
        console.error('Subscribe error:', err.response?.data || err.message);
        return jsonError('Erro ao criar assinatura: ' + msg, 500);
    }
}
