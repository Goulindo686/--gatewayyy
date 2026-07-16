export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { supabase } from '@/lib/db';

function parseDate(value: string, field: string) {
    if (!value) return null;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new Error(`${field} invalido`);
    }

    return date;
}

export async function GET(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Nao autorizado', 401);

    const url = new URL(req.url);

    let startDate: Date | null;
    let endDate: Date | null;

    try {
        startDate = parseDate(url.searchParams.get('start') || '', 'Inicio do periodo');
        endDate = parseDate(url.searchParams.get('end') || '', 'Fim do periodo');
    } catch (error) {
        return jsonError(error instanceof Error ? error.message : 'Periodo invalido', 400);
    }

    if (startDate && endDate && startDate > endDate) {
        return jsonError('O inicio do periodo deve ser anterior ao fim', 400);
    }

    const buildCountQuery = (status?: string) => {
        let query = supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('seller_id', auth.user.id);

        if (status) query = query.eq('status', status);
        if (startDate) query = query.gte('created_at', startDate.toISOString());
        if (endDate) query = query.lte('created_at', endDate.toISOString());

        return query;
    };

    const [totalResult, paidResult] = await Promise.all([
        buildCountQuery(),
        buildCountQuery('paid'),
    ]);

    if (totalResult.error || paidResult.error) {
        console.error('[CONVERSION] Error counting orders:', totalResult.error || paidResult.error);
        return jsonError('Erro ao calcular taxa de conversao', 500);
    }

    const total = totalResult.count || 0;
    const paid = paidResult.count || 0;
    const notConverted = Math.max(0, total - paid);
    const rate = total > 0 ? Number(((paid / total) * 100).toFixed(2)) : 0;

    const response = jsonSuccess({
        rate,
        total,
        paid,
        not_converted: notConverted,
    });

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
}
