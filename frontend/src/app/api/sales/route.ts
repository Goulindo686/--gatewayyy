export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { fetchAll, supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';

type SaleRow = {
    id: string;
    product_id?: string | null;
    buyer_name?: string | null;
    buyer_email?: string | null;
    buyer_cpf?: string | null;
    buyer_phone?: string | null;
    amount?: number | null;
    payment_method?: string | null;
    status?: string | null;
    pagarme_order_id?: string | null;
    pagarme_charge_id?: string | null;
    created_at?: string | null;
    delivered?: boolean | null;
    delivered_at?: string | null;
    affiliate_id?: string | null;
    affiliate_commission_amount?: number | null;
    platform_fee_amount?: number | null;
    products?: { name?: string | null } | null;
};

type AffiliateCommissionRow = {
    id: string;
    order_id?: string | null;
    subscription_id?: string | null;
    product_id?: string | null;
    producer_id?: string | null;
    gross_amount?: number | null;
    commission_amount?: number | null;
    commission_rate_bps?: number | null;
    status?: string | null;
    source_type?: string | null;
    created_at?: string | null;
    products?: { name?: string | null } | null;
    orders?: {
        payment_method?: string | null;
    } | null;
};

type ReferencedUserRow = {
    id: string;
    name?: string | null;
    email?: string | null;
};

function commissionStatusToSaleStatus(status?: string | null) {
    if (status === 'approved' || status === 'available') return 'paid';
    if (status === 'refunded' || status === 'chargeback') return 'refunded';
    if (status === 'cancelled') return 'cancelled';
    if (status === 'failed') return 'failed';
    return 'pending';
}

function normalizeSearchText(value: unknown) {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

export async function GET(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);

    const { searchParams } = req.nextUrl;
    const status = searchParams.get('status') || '';
    const method = searchParams.get('method') || '';
    const start = searchParams.get('start') || '';
    const end = searchParams.get('end') || '';
    const search = searchParams.get('search')?.trim() || '';
    const requestedPage = Math.max(1, Math.trunc(Number(searchParams.get('page') || 1)) || 1);
    const pageSize = Math.min(
        100,
        Math.max(10, Math.trunc(Number(searchParams.get('per_page') || 50)) || 50),
    );

    let producerSalesQuery = supabase
        .from('orders')
        .select('id, product_id, buyer_name, buyer_email, buyer_cpf, buyer_phone, amount, payment_method, status, pagarme_order_id, pagarme_charge_id, created_at, delivered, delivered_at, affiliate_id, affiliate_commission_amount, platform_fee_amount, products(name)')
        .eq('seller_id', auth.user.id)
        .order('created_at', { ascending: false });

    let affiliateSalesQuery = supabase
        .from('affiliate_commissions')
        .select('id, order_id, subscription_id, product_id, producer_id, gross_amount, commission_amount, commission_rate_bps, status, source_type, created_at, products(name), orders(payment_method)')
        .eq('affiliate_id', auth.user.id)
        .order('created_at', { ascending: false });

    if (start) {
        producerSalesQuery = producerSalesQuery.gte('created_at', start);
        affiliateSalesQuery = affiliateSalesQuery.gte('created_at', start);
    }
    if (end) {
        producerSalesQuery = producerSalesQuery.lte('created_at', end);
        affiliateSalesQuery = affiliateSalesQuery.lte('created_at', end);
    }

    let producerSales: SaleRow[];
    let affiliateCommissions: AffiliateCommissionRow[];
    try {
        [producerSales, affiliateCommissions] = await Promise.all([
            fetchAll<SaleRow>(producerSalesQuery),
            fetchAll<AffiliateCommissionRow>(affiliateSalesQuery).catch((error) => {
                console.error('[SALES] Affiliate sales lookup error:', error);
                return [] as AffiliateCommissionRow[];
            }),
        ]);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'erro desconhecido';
        return jsonError('Erro ao buscar vendas: ' + message);
    }

    const referencedUserIds = Array.from(new Set([
        ...producerSales.map((sale) => sale.affiliate_id).filter((id): id is string => Boolean(id)),
        ...affiliateCommissions.map((commission) => commission.producer_id).filter((id): id is string => Boolean(id)),
    ]));
    const { data: referencedUsers } = referencedUserIds.length
        ? await supabase.from('users').select('id, name, email').in('id', referencedUserIds)
        : { data: [] };
    const userById = Object.fromEntries(
        ((referencedUsers || []) as ReferencedUserRow[]).map((user) => [user.id, user]),
    ) as Record<string, ReferencedUserRow>;

    const formattedProducerSales = producerSales.map((sale) => {
        const grossAmount = Math.max(0, Math.round(Number(sale.amount) || 0));
        const platformFeeAmount = Math.max(0, Math.round(Number(sale.platform_fee_amount) || 0));
        const commissionAmount = Math.max(0, Math.round(Number(sale.affiliate_commission_amount) || 0));
        const isAffiliateSale = Boolean(sale.affiliate_id && commissionAmount > 0);
        const affiliate = sale.affiliate_id ? userById[sale.affiliate_id] : null;

        return {
            ...sale,
            product_name: sale.products?.name || (!sale.product_id && sale.payment_method === 'pix' ? 'API Pix' : '—'),
            amount: grossAmount,
            amount_display: (grossAmount / 100).toFixed(2),
            gross_amount: grossAmount,
            platform_fee_amount: platformFeeAmount,
            commission_amount: commissionAmount,
            net_amount: Math.max(0, grossAmount - platformFeeAmount - commissionAmount),
            sale_kind: isAffiliateSale ? 'affiliate_sale' : 'direct_sale',
            affiliate_name: affiliate?.name || affiliate?.email || null,
            can_manage_delivery: true,
        };
    });

    const formattedAffiliateSales = affiliateCommissions.map((commission) => {
        const commissionAmount = Math.max(0, Math.round(Number(commission.commission_amount) || 0));
        const producer = commission.producer_id ? userById[commission.producer_id] : null;

        return {
            id: `affiliate-commission-${commission.id}`,
            commission_id: commission.id,
            order_id: commission.order_id,
            subscription_id: commission.subscription_id,
            product_id: commission.product_id,
            product_name: commission.products?.name || 'Produto',
            buyer_name: null,
            buyer_email: null,
            buyer_cpf: null,
            buyer_phone: null,
            amount: commissionAmount,
            amount_display: (commissionAmount / 100).toFixed(2),
            gross_amount: Math.max(0, Math.round(Number(commission.gross_amount) || 0)),
            commission_amount: commissionAmount,
            commission_rate_bps: Math.max(0, Math.round(Number(commission.commission_rate_bps) || 0)),
            payment_method: commission.orders?.payment_method
                || (commission.source_type?.startsWith('subscription') ? 'recurrence' : 'affiliate'),
            status: commissionStatusToSaleStatus(commission.status),
            commission_status: commission.status,
            source_type: commission.source_type,
            created_at: commission.created_at,
            producer_id: commission.producer_id,
            producer_name: producer?.name || producer?.email || null,
            sale_kind: 'affiliate_commission',
            delivered: null,
            delivered_at: null,
            can_manage_delivery: false,
        };
    });

    let sales = [...formattedProducerSales, ...formattedAffiliateSales]
        .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

    if (status) sales = sales.filter((sale) => sale.status === status);
    if (method) sales = sales.filter((sale) => sale.payment_method === method);

    if (search) {
        const searchText = normalizeSearchText(search);
        const searchDigits = search.replace(/\D/g, '');
        sales = sales.filter((sale) => {
            const searchable = [
                sale.id,
                sale.product_name,
                sale.buyer_name,
                sale.buyer_email,
                sale.buyer_cpf,
                sale.buyer_phone,
                'pagarme_order_id' in sale ? sale.pagarme_order_id : null,
                'pagarme_charge_id' in sale ? sale.pagarme_charge_id : null,
                sale.status,
                sale.payment_method,
                sale.sale_kind === 'affiliate_commission' ? 'comissao afiliado' : null,
                sale.sale_kind === 'affiliate_sale' ? 'venda afiliado' : null,
                'affiliate_name' in sale ? sale.affiliate_name : null,
                'producer_name' in sale ? sale.producer_name : null,
            ].map(normalizeSearchText);
            const cpf = String(sale.buyer_cpf || '').replace(/\D/g, '');
            const phone = String(sale.buyer_phone || '').replace(/\D/g, '');

            return (
                searchable.some((value) => value.includes(searchText))
                || Boolean(searchDigits && cpf.includes(searchDigits))
                || Boolean(searchDigits && phone.includes(searchDigits))
            );
        });
    }

    const totalCount = sales.length;
    const totalAmount = sales.reduce((sum, sale) => sum + (sale.amount || 0), 0);
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const pageStart = (page - 1) * pageSize;
    const paginatedSales = sales.slice(pageStart, pageStart + pageSize);

    return jsonSuccess({
        sales: paginatedSales,
        summary: {
            count: totalCount,
            total_amount: totalAmount,
            total_amount_display: (totalAmount / 100).toFixed(2),
        },
        pagination: {
            page,
            page_size: pageSize,
            total_pages: totalPages,
            total_count: totalCount,
        },
    });
}
