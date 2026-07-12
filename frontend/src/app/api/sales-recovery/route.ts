import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type RecoverySetting = {
    product_id: string;
    enabled: boolean;
    delay_minutes: number;
    updated_at?: string;
};

type ProductRow = {
    id: string;
    name: string;
    price: number;
    price_display?: string;
    image_url?: string;
    status: string;
};

type WhatsappRecoveryOrder = {
    id: string;
    product_id: string;
    buyer_name?: string | null;
    buyer_email?: string | null;
    buyer_phone?: string | null;
    amount: number;
    amount_display?: string | null;
    pix_expires_at?: string | null;
    created_at: string;
    products?: {
        name?: string | null;
        checkout_settings?: { hide_phone?: boolean } | null;
    } | Array<{
        name?: string | null;
        checkout_settings?: { hide_phone?: boolean } | null;
    }>;
};

export async function GET(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Nao autorizado', 401);

    const [{ data: products, error: productsError }, { data: settings, error: settingsError }, { data: sentEmails }, { data: whatsappOrders, error: whatsappError }] = await Promise.all([
        supabase
            .from('products')
            .select('id, name, price, price_display, image_url, status')
            .eq('user_id', auth.user.id)
            .order('created_at', { ascending: false }),
        supabase
            .from('sales_recovery_settings')
            .select('product_id, enabled, delay_minutes, updated_at')
            .eq('user_id', auth.user.id),
        supabase
            .from('sales_recovery_emails')
            .select('product_id')
            .eq('user_id', auth.user.id),
        supabase
            .from('orders')
            .select('id, product_id, buyer_name, buyer_email, buyer_phone, amount, amount_display, pix_expires_at, created_at, products(name, checkout_settings)')
            .eq('seller_id', auth.user.id)
            .eq('payment_method', 'pix')
            .eq('status', 'pending')
            .not('buyer_phone', 'is', null)
            .order('created_at', { ascending: false })
            .limit(200),
    ]);

    if (productsError || settingsError || whatsappError) {
        console.error('[SALES RECOVERY] Failed to load settings:', productsError || settingsError || whatsappError);
        return jsonError('Erro ao carregar recuperacao de vendas', 500);
    }

    const settingsByProduct = Object.fromEntries((settings || []).map((item: RecoverySetting) => [item.product_id, item]));
    const sentByProduct = (sentEmails || []).reduce((acc: Record<string, number>, item: { product_id: string }) => {
        acc[item.product_id] = (acc[item.product_id] || 0) + 1;
        return acc;
    }, {});

    const now = new Date();
    const whatsapp_recoveries = ((whatsappOrders || []) as WhatsappRecoveryOrder[])
        .map(order => {
            const product = Array.isArray(order.products) ? order.products[0] : order.products;
            return { order, product };
        })
        .filter(({ order, product }) => {
            const digits = String(order.buyer_phone || '').replace(/\D/g, '');
            if (!digits) return false;
            if (order.pix_expires_at && new Date(order.pix_expires_at) <= now) return false;
            return product?.checkout_settings?.hide_phone !== true;
        })
        .map(({ order, product }) => ({
            id: order.id,
            product_id: order.product_id,
            product_name: product?.name || 'Produto',
            buyer_name: order.buyer_name,
            buyer_email: order.buyer_email,
            buyer_phone: order.buyer_phone,
            amount: order.amount,
            amount_display: order.amount_display || (order.amount / 100).toFixed(2),
            pix_expires_at: order.pix_expires_at,
            created_at: order.created_at,
        }));

    return jsonSuccess({
        products: (products || []).map((product: ProductRow) => ({
            ...product,
            price_display: product.price_display || (product.price / 100).toFixed(2),
            recovery: settingsByProduct[product.id] || {
                product_id: product.id,
                enabled: false,
                delay_minutes: 30,
            },
            reminders_sent: sentByProduct[product.id] || 0,
        })),
        whatsapp_recoveries,
    });
}

export async function PUT(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Nao autorizado', 401);

    const body = await req.json();
    const productId = String(body.product_id || '');
    const delayMinutes = Number(body.delay_minutes);

    if (!productId) return jsonError('Selecione um produto');
    if (!Number.isInteger(delayMinutes) || delayMinutes < 5 || delayMinutes > 1440) {
        return jsonError('O tempo deve ficar entre 5 minutos e 24 horas');
    }

    const { data: product } = await supabase
        .from('products')
        .select('id')
        .eq('id', productId)
        .eq('user_id', auth.user.id)
        .single();

    if (!product) return jsonError('Produto nao encontrado', 404);

    const { data: setting, error } = await supabase
        .from('sales_recovery_settings')
        .upsert({
            user_id: auth.user.id,
            product_id: productId,
            enabled: Boolean(body.enabled),
            delay_minutes: delayMinutes,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,product_id' })
        .select('product_id, enabled, delay_minutes, updated_at')
        .single();

    if (error) {
        console.error('[SALES RECOVERY] Failed to save setting:', error);
        return jsonError('Erro ao salvar configuracao', 500);
    }

    return jsonSuccess({ setting });
}
