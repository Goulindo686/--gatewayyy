import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { syncMemberEntitlements } from '@/lib/member-entitlements';

export async function GET(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);

    const normalizedEmail = (auth.user.email || '').toLowerCase().trim();
    if (normalizedEmail) {
        await syncMemberEntitlements(auth.user.id, normalizedEmail);
    }

    const { data: enrollments, error } = await supabase
        .from('enrollments')
        .select(`
            id,
            status,
            created_at,
            products (
                id,
                name,
                description,
                image_url
            )
        `)
        .eq('user_id', auth.user.id)
        .eq('status', 'active');

    if (error) return jsonError('Erro ao carregar seus produtos');

    const products = enrollments.map((e: any) => ({
        ...e.products,
        enrollment_id: e.id
    }));

    return jsonSuccess({ products });
}
