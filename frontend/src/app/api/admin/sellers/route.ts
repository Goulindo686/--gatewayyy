export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';

type SellerFeeSetting = {
    seller_id: string;
    fee_type: 'exempt' | 'fixed' | 'percentage';
    fixed_fee_cents: number | null;
    percentage: number | null;
    updated_at: string;
};

export async function GET(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth || auth.user.role !== 'admin') return jsonError('Não autorizado', 403);

    const ip =
        req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        req.headers.get('x-real-ip') ||
        'unknown';
    const rl = await checkRateLimit({ key: `admin:sellers:get:${auth.user.id}:${ip}`, limit: 60, windowSecs: 60, failOpen: true });
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const search = req.nextUrl.searchParams.get('search') || '';

    let query = supabase
        .from('users')
        .select('id, name, email, cpf_cnpj, status, created_at')
        .eq('role', 'seller')
        .order('created_at', { ascending: false });

    if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: sellers, error: sellersError } = await query;
    if (sellersError) return jsonError('Erro ao listar vendedores', 500);

    const sellerIds = (sellers || []).map(seller => seller.id);
    let feeSettings: SellerFeeSetting[] = [];
    if (sellerIds.length > 0) {
        const { data } = await supabase
            .from('seller_pix_fee_settings')
            .select('seller_id, fee_type, fixed_fee_cents, percentage, updated_at')
            .in('seller_id', sellerIds);
        feeSettings = (data || []) as SellerFeeSetting[];
    }

    const feeBySeller = new Map(feeSettings.map(setting => [setting.seller_id, setting]));
    const sellersWithPixFee = (sellers || []).map(seller => ({
        ...seller,
        pix_fee: feeBySeller.get(seller.id) || null,
    }));

    return jsonSuccess({ sellers: sellersWithPixFee });
}
