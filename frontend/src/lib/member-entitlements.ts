import { supabase } from '@/lib/db';
import { getUniqueDeliveryPurchaseKeys } from '@/lib/unique-deliveries';

type ProductRelation = {
    type?: string | null;
};

type PaidOrderRow = {
    id: string;
    product_id?: string | null;
    products?: ProductRelation | ProductRelation[] | null;
};

type SubscriptionPlanRelation = {
    product_id?: string | null;
    products?: ProductRelation | ProductRelation[] | null;
};

type ActiveSubscriptionRow = {
    subscription_plans?: SubscriptionPlanRelation | SubscriptionPlanRelation[] | null;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | undefined {
    if (value == null) return undefined;
    return Array.isArray(value) ? value[0] : value;
}

/**
 * Libera produtos digitais apenas para um usuário já autenticado ou que esteja
 * concluindo cadastro/verificação. O e-mail de checkout nunca autentica alguém.
 */
export async function syncMemberEntitlements(userId: string, email: string) {
    const normalizedEmail = String(email || '').toLowerCase().trim();
    if (!userId || !normalizedEmail) return;

    const [ordersResult, subscriptionsResult] = await Promise.all([
        supabase
            .from('orders')
            .select(`
                id,
                product_id,
                products (
                    type
                )
            `)
            .eq('status', 'paid')
            .ilike('buyer_email', normalizedEmail),
        supabase
            .from('subscriptions')
            .select(`
                id,
                subscription_plans (
                    product_id,
                    products (
                        type
                    )
                )
            `)
            .eq('status', 'active')
            .ilike('customer_email', normalizedEmail),
    ]);

    if (ordersResult.error) {
        console.error('[MEMBERS] Falha ao sincronizar compras:', ordersResult.error.message);
    }
    if (subscriptionsResult.error) {
        console.error('[MEMBERS] Falha ao sincronizar assinaturas:', subscriptionsResult.error.message);
    }

    const products = new Map<string, string | null>();
    const paidOrders = (ordersResult.data || []) as unknown as PaidOrderRow[];
    let uniqueDeliveryPurchases = new Set<string>();

    try {
        uniqueDeliveryPurchases = await getUniqueDeliveryPurchaseKeys(
            paidOrders.map((order) => order.id),
        );
    } catch (error) {
        console.error(
            '[MEMBERS] Falha ao validar a modalidade das compras:',
            error instanceof Error ? error.message : 'erro desconhecido',
        );
        // Em caso de erro inesperado, nao concede matriculas novas a partir de
        // pedidos ate comprovar que eles usam a Area de Membros.
        paidOrders.length = 0;
    }

    for (const order of paidOrders) {
        const product = firstRelation(order.products);
        const isUniqueDelivery = order.product_id
            ? uniqueDeliveryPurchases.has(`${order.id}:${order.product_id}`)
            : false;
        if (order.product_id && product?.type === 'digital' && !isUniqueDelivery) {
            products.set(order.product_id, order.id);
        }
    }

    for (const subscription of (subscriptionsResult.data || []) as unknown as ActiveSubscriptionRow[]) {
        const plan = firstRelation(subscription.subscription_plans);
        const product = firstRelation(plan?.products);
        if (plan?.product_id && product?.type === 'digital' && !products.has(plan.product_id)) {
            products.set(plan.product_id, null);
        }
    }

    if (products.size === 0) return;

    const { error } = await supabase
        .from('enrollments')
        .upsert(
            Array.from(products, ([productId, orderId]) => ({
                user_id: userId,
                product_id: productId,
                order_id: orderId,
                status: 'active',
            })),
            { onConflict: 'user_id, product_id' },
        );

    if (error) {
        console.error('[MEMBERS] Falha ao liberar produtos:', error.message);
    }
}
