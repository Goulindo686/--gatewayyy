export const dynamic = 'force-dynamic';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { supabase } from '@/lib/db';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import {
    assertUniqueDeliveryEncryptionConfigured,
    encryptUniqueDeliveryPayload,
} from '@/lib/unique-delivery-crypto';
import {
    UNIQUE_DELIVERY_MAX_BATCH,
    maskUniqueDeliveryEmail,
    normalizeUniqueDeliveryPayload,
    requestIp,
    requireOwnedProduct,
    withSensitiveResponseHeaders,
} from '@/lib/unique-deliveries';

type RouteContext = { params: Promise<{ id: string }> };

function protectedError(message: string, status = 400) {
    return withSensitiveResponseHeaders(jsonError(message, status));
}

async function authorize(req: NextRequest, productId: string) {
    const auth = await getAuthUser(req);
    if (!auth) return { error: protectedError('Nao autorizado', 401) };

    const product = await requireOwnedProduct(productId, auth.user.id);
    if (!product) return { error: protectedError('Produto nao encontrado', 404) };

    return { auth, product };
}

export async function GET(req: NextRequest, { params }: RouteContext) {
    const { id: productId } = await params;

    try {
        const authorization = await authorize(req, productId);
        if ('error' in authorization) return authorization.error;

        const [settingsResult, itemsResult, fulfillmentsResult] = await Promise.all([
            supabase
                .from('unique_delivery_settings')
                .select('enabled, enabled_at, created_at, updated_at')
                .eq('product_id', productId)
                .maybeSingle(),
            supabase
                .from('unique_delivery_items')
                .select('id, inventory_sequence, status, assigned_at, created_at')
                .eq('product_id', productId)
                .eq('seller_id', authorization.auth.user.id)
                .order('created_at', { ascending: false }),
            supabase
                .from('unique_delivery_fulfillments')
                .select('id, order_id, item_id, status, assigned_at, first_viewed_at, view_count, created_at')
                .eq('product_id', productId)
                .eq('seller_id', authorization.auth.user.id)
                .order('created_at', { ascending: false }),
        ]);

        if (settingsResult.error || itemsResult.error || fulfillmentsResult.error) {
            return protectedError(
                'Modulo indisponivel. Confirme a aplicacao da migration 028.',
                503,
            );
        }

        const items = itemsResult.data || [];
        const fulfillments = fulfillmentsResult.data || [];
        const orderIds = fulfillments.map((entry: any) => entry.order_id).filter(Boolean);

        const ordersResult = orderIds.length
            ? await supabase
                .from('orders')
                .select('id, buyer_email, status')
                .eq('seller_id', authorization.auth.user.id)
                .in('id', orderIds)
            : { data: [], error: null };

        if (ordersResult.error) {
            return protectedError('Nao foi possivel carregar o inventario.', 500);
        }

        const ordersById = new Map(
            (ordersResult.data || []).map((order: any) => [order.id, order]),
        );
        const fulfillmentByItem = new Map(
            fulfillments
                .filter((entry: any) => entry.item_id)
                .map((entry: any) => [entry.item_id, entry]),
        );
        const inventory = items.map((item: any) => {
            const fulfillment: any = fulfillmentByItem.get(item.id);
            const order: any = fulfillment ? ordersById.get(fulfillment.order_id) : null;
            return {
                id: item.id,
                number: item.inventory_sequence,
                status: item.status,
                created_at: item.created_at,
                assigned_at: item.assigned_at,
                fulfillment: fulfillment ? {
                    id: fulfillment.id,
                    order_id: fulfillment.order_id,
                    status: fulfillment.status,
                    assigned_at: fulfillment.assigned_at,
                    first_viewed_at: fulfillment.first_viewed_at,
                    view_count: fulfillment.view_count,
                    buyer_email: maskUniqueDeliveryEmail(order?.buyer_email || ''),
                    order_status: order?.status || null,
                } : null,
            };
        });

        const savedSettings = settingsResult.data || {
            enabled: false,
            enabled_at: null,
        };
        const response = jsonSuccess({
            product: {
                id: authorization.product.id,
                name: authorization.product.name,
            },
            settings: {
                ...savedSettings,
                delivery_mode: savedSettings.enabled ? 'unique' : 'members',
            },
            summary: {
                total: inventory.length,
                available: inventory.filter((item: any) => item.status === 'available').length,
                assigned: inventory.filter((item: any) => item.status === 'assigned').length,
                waiting: fulfillments.filter((entry: any) => entry.status === 'stock_unavailable').length,
            },
            inventory,
        });
        return withSensitiveResponseHeaders(response);
    } catch {
        console.error('[UNIQUE DELIVERY] Failed to list seller inventory');
        return protectedError('Erro ao carregar entregas unicas.', 500);
    }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
    const { id: productId } = await params;

    try {
        const authorization = await authorize(req, productId);
        if ('error' in authorization) return authorization.error;

        const ip = requestIp(req);
        const [ipLimit, userLimit] = await Promise.all([
            checkRateLimit({
                key: `unique-delivery:create:ip:${ip}`,
                limit: 30,
                windowSecs: 3600,
                failOpen: false,
            }),
            checkRateLimit({
                key: `unique-delivery:create:user:${authorization.auth.user.id}`,
                limit: 30,
                windowSecs: 3600,
                failOpen: false,
            }),
        ]);
        if (!ipLimit.allowed) return rateLimitResponse(ipLimit.resetAt);
        if (!userLimit.allowed) return rateLimitResponse(userLimit.resetAt);

        const contentType = req.headers.get('content-type') || '';
        if (!contentType.toLowerCase().includes('application/json')) {
            return protectedError('Content-Type invalido.', 415);
        }

        const contentLength = Number(req.headers.get('content-length') || 0);
        if (contentLength > 2 * 1024 * 1024) {
            return protectedError('Lote muito grande.', 413);
        }

        assertUniqueDeliveryEncryptionConfigured();
        const body = await req.json();
        const submitted = Array.isArray(body?.items) ? body.items : [];
        if (submitted.length < 1 || submitted.length > UNIQUE_DELIVERY_MAX_BATCH) {
            return protectedError(
                `Envie entre 1 e ${UNIQUE_DELIVERY_MAX_BATCH} entregas por lote.`,
            );
        }

        const rows: any[] = [];
        const fingerprints = new Set<string>();
        let repeatedInBatch = 0;

        for (const raw of submitted) {
            const payload = normalizeUniqueDeliveryPayload(raw);
            const itemId = uuidv4();
            const encrypted = encryptUniqueDeliveryPayload(productId, itemId, payload);

            if (fingerprints.has(encrypted.fingerprint)) {
                repeatedInBatch += 1;
                continue;
            }
            fingerprints.add(encrypted.fingerprint);

            rows.push({
                id: itemId,
                product_id: productId,
                seller_id: authorization.auth.user.id,
                payload_ciphertext: encrypted.ciphertext,
                payload_iv: encrypted.iv,
                payload_auth_tag: encrypted.authTag,
                payload_fingerprint: encrypted.fingerprint,
                encryption_version: encrypted.encryptionVersion,
                status: 'available',
            });
        }

        const { data: created, error } = await supabase
            .from('unique_delivery_items')
            .upsert(rows, {
                onConflict: 'product_id,payload_fingerprint',
                ignoreDuplicates: true,
            })
            .select('id, inventory_sequence');
        if (error) {
            return protectedError('Nao foi possivel salvar o lote criptografado.', 500);
        }

        const createdRows = created || [];
        if (createdRows.length > 0) {
            const firstCreatedAt = new Date().toISOString();
            const { error: settingsError } = await supabase
                .from('unique_delivery_settings')
                .upsert({
                    product_id: productId,
                    seller_id: authorization.auth.user.id,
                    enabled: true,
                    enabled_at: firstCreatedAt,
                }, { onConflict: 'product_id', ignoreDuplicates: true });
            if (settingsError) {
                console.error('[UNIQUE DELIVERY] Failed to auto-enable settings:', settingsError.message);
            }
        }
        const response = jsonSuccess({
            created: createdRows.map((item: any) => ({
                id: item.id,
                number: item.inventory_sequence,
            })),
            created_count: createdRows.length,
            duplicate_count: repeatedInBatch + Math.max(0, rows.length - createdRows.length),
        }, 201);
        return withSensitiveResponseHeaders(response);
    } catch (error: any) {
        if (/UNIQUE_DELIVERY_ENCRYPTION_KEY/.test(String(error?.message || ''))) {
            return protectedError('Criptografia do modulo nao configurada.', 503);
        }
        if (
            /obrigatorio|invalido|deve usar/i.test(String(error?.message || ''))
        ) {
            return protectedError(error.message, 400);
        }
        console.error('[UNIQUE DELIVERY] Failed to create encrypted inventory');
        return protectedError('Erro ao cadastrar entregas unicas.', 500);
    }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
    const { id: productId } = await params;

    try {
        const authorization = await authorize(req, productId);
        if ('error' in authorization) return authorization.error;

        const body = await req.json();
        const requestedMode = body?.mode
            ?? (typeof body?.enabled === 'boolean'
                ? body.enabled ? 'unique' : 'members'
                : null);
        if (!['members', 'unique'].includes(requestedMode)) {
            return protectedError('Selecione Area de Membros ou Entrega Unica.');
        }
        const enableUniqueDelivery = requestedMode === 'unique';

        const { data: current, error: currentError } = await supabase
            .from('unique_delivery_settings')
            .select('enabled, enabled_at')
            .eq('product_id', productId)
            .maybeSingle();
        if (currentError) {
            return protectedError(
                'Modulo indisponivel. Confirme a aplicacao da migration 028.',
                503,
            );
        }

        if (enableUniqueDelivery) {
            assertUniqueDeliveryEncryptionConfigured();
            const { count: subscriptionPlanCount, error: subscriptionPlanError } = await supabase
                .from('subscription_plans')
                .select('id', { count: 'exact', head: true })
                .eq('product_id', productId)
                .eq('status', 'active');
            if (subscriptionPlanError) throw subscriptionPlanError;
            if (subscriptionPlanCount) {
                return protectedError(
                    'Entregas Unicas podem ser ativadas apenas em produtos de venda avulsa.',
                    409,
                );
            }
        }

        const enabledAt = enableUniqueDelivery
            ? current?.enabled
                ? current.enabled_at
                : new Date().toISOString()
            : current?.enabled_at || null;

        const { data: settings, error } = await supabase
            .from('unique_delivery_settings')
            .upsert({
                product_id: productId,
                seller_id: authorization.auth.user.id,
                enabled: enableUniqueDelivery,
                enabled_at: enabledAt,
            }, { onConflict: 'product_id' })
            .select('enabled, enabled_at, updated_at')
            .single();
        if (error) throw error;

        return withSensitiveResponseHeaders(jsonSuccess({
            settings: {
                ...settings,
                delivery_mode: settings.enabled ? 'unique' : 'members',
            },
        }));
    } catch (error: any) {
        if (/UNIQUE_DELIVERY_ENCRYPTION_KEY/.test(String(error?.message || ''))) {
            return protectedError('Criptografia do modulo nao configurada.', 503);
        }
        console.error('[UNIQUE DELIVERY] Failed to update settings');
        return protectedError('Erro ao atualizar o modulo.', 500);
    }
}
