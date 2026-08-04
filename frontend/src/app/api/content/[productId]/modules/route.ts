import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { enforceContentRateLimit, getOwnedProduct } from '@/lib/content-access';
import { normalizeOrder, normalizeSafeText, requestBodyTooLarge, SecurityValidationError } from '@/lib/request-security';

export async function GET(req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
    const { productId } = await params;
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);
    const limited = await enforceContentRateLimit(auth.user.id, 'read');
    if (limited) return limited;
    if (!await getOwnedProduct(productId, auth.user.id)) return jsonError('Produto não encontrado', 404);

    const { data: modules, error } = await supabase
        .from('product_modules')
        .select('*')
        .eq('product_id', productId)
        .order('order', { ascending: true });

    if (error) return jsonError('Erro ao carregar módulos');
    return jsonSuccess({ modules });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
    const { productId } = await params;
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);
    const limited = await enforceContentRateLimit(auth.user.id, 'write');
    if (limited) return limited;
    if (requestBodyTooLarge(req, 16_384)) return jsonError('Requisição muito grande', 413);
    if (!await getOwnedProduct(productId, auth.user.id)) return jsonError('Produto não encontrado', 404);

    try {
        const { title, order } = await req.json();
        const safeTitle = normalizeSafeText(title, { field: 'Título', maxLength: 160, required: true });
        const safeOrder = normalizeOrder(order);

        const { data: module, error } = await supabase
            .from('product_modules')
            .insert({ product_id: productId, title: safeTitle, order: safeOrder })
            .select()
            .single();

        if (error) return jsonError('Erro ao criar módulo');
        return jsonSuccess({ module, message: 'Módulo criado com sucesso!' }, 201);
    } catch (err) {
        if (err instanceof SecurityValidationError) return jsonError(err.message, 400);
        return jsonError('Dados inválidos', 400);
    }
}
