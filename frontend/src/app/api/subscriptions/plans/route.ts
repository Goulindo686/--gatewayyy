import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { PagarmeService } from '@/lib/pagarme';
import { v4 as uuidv4 } from 'uuid';

// GET — lista planos do vendedor
export async function GET(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);

    const { data: plans } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false });

    return jsonSuccess({ plans: plans || [] });
}

// POST — cria novo plano
export async function POST(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);

    try {
        const { name, description, amount, interval, interval_count, product_id } = await req.json();

        if (!name || !amount || !interval) return jsonError('Nome, valor e intervalo são obrigatórios');

        const amountCents = Math.round(parseFloat(String(amount).replace(',', '.')) * 100);
        if (!amountCents || amountCents < 100) return jsonError('Valor mínimo é R$1,00');

        // Busca recipient do vendedor
        const { data: recipient } = await supabase
            .from('recipients').select('pagarme_recipient_id').eq('user_id', auth.user.id).single();
        if (!recipient) return jsonError('Configure seus dados bancários antes de criar planos de assinatura', 400);

        // Busca taxa da plataforma
        let feePercentage = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '2');
        try {
            const { data: settings } = await supabase.from('platform_settings').select('fee_percentage').single();
            if (settings?.fee_percentage !== undefined) feePercentage = settings.fee_percentage;
        } catch {}
        if (auth.user.role === 'admin') feePercentage = 0;

        // Cria plano no Pagar.me
        const pagarmePlan = await PagarmeService.createPlan({
            name,
            amount: amountCents,
            interval: interval as 'monthly' | 'weekly' | 'yearly',
            interval_count: interval_count || 1
        });

        // Salva no banco
        const { data: plan, error } = await supabase.from('subscription_plans').insert({
            id: uuidv4(),
            user_id: auth.user.id,
            product_id: product_id || null,
            name,
            description: description || null,
            amount: amountCents,
            interval,
            interval_count: interval_count || 1,
            pagarme_plan_id: pagarmePlan.id,
            status: 'active'
        }).select().single();

        if (error) return jsonError('Erro ao salvar plano: ' + error.message);

        return jsonSuccess({ plan }, 201);
    } catch (err: any) {
        const msg = err.response?.data?.message || err.message;
        return jsonError('Erro ao criar plano: ' + msg, 500);
    }
}
