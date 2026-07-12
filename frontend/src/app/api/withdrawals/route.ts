export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { PagarmeService } from '@/lib/pagarme';
import { sendPushNotification } from '@/lib/webpush';
import { v4 as uuidv4 } from 'uuid';

const WITHDRAWAL_FEE_CENTS = 367;
const TERMINAL_TRANSFER_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

async function createPendingWithdrawal({
    userId,
    amountInCents,
    pixKey,
    pixKeyType,
}: {
    userId: string;
    amountInCents: number;
    pixKey?: string | null;
    pixKeyType?: string | null;
}) {
    const id = uuidv4();
    const basePayload = {
        id,
        user_id: userId,
        amount: amountInCents,
        status: 'pending',
    };

    const { data, error } = await supabase.from('withdrawals').insert({
        ...basePayload,
        pix_key: pixKey,
        pix_key_type: pixKeyType,
    }).select().single();

    if (!error) return { data, error: null };

    const message = `${error.message || ''} ${error.details || ''}`.toLowerCase();
    const shouldRetryMinimal =
        message.includes('pix_key') ||
        message.includes('pix_key_type') ||
        message.includes('schema cache') ||
        message.includes('column');

    if (!shouldRetryMinimal) return { data: null, error };

    console.warn('[WITHDRAWAL] Retrying insert with minimal payload:', error.message);
    return supabase.from('withdrawals').insert(basePayload).select().single();
}

export async function GET(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Nao autorizado', 401);

    const ip =
        req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        req.headers.get('x-real-ip') ||
        'unknown';
    const rl = await checkRateLimit({ key: `withdrawals:get:ip:${ip}`, limit: 120, windowSecs: 60, failOpen: true });
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const { data: localWithdrawals } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false });

    const localRows = localWithdrawals || [];
    const localFormatted = localRows.map(w => ({
        id: w.id,
        amount_display: w.amount_display || (w.amount / 100).toFixed(2),
        pix_key: w.pix_key || '-',
        status: w.status || 'completed',
        created_at: w.created_at,
        source: 'local',
    }));

    try {
        const { data: recipient } = await supabase
            .from('recipients')
            .select('pagarme_recipient_id')
            .eq('user_id', auth.user.id)
            .single();

        if (recipient?.pagarme_recipient_id) {
            const transfersData = await PagarmeService.getRecipientTransfers(recipient.pagarme_recipient_id);
            const completedStatuses = new Set(['transferred', 'paid', 'completed']);
            const failedStatuses = new Set(['failed', 'canceled', 'cancelled', 'refused']);
            const localTransferIds = new Set(localRows.map(w => w.pagarme_transfer_id).filter(Boolean));
            const matchedLocalIds = new Set<string>();
            const displayById = new Map(localFormatted.map(w => [w.id, w]));
            const transferRows = transfersData?.data || [];

            const pagarmeTransfers = await Promise.all(transferRows
                .filter((t: any) => completedStatuses.has(t.status) || failedStatuses.has(t.status))
                .filter((t: any) => !localTransferIds.has(t.id))
                .map(async (t: any) => {
                    const terminalStatus = completedStatuses.has(t.status) ? 'completed' : 'failed';
                    const transferCreatedAt = new Date(t.created_at).getTime();
                    const match = localRows
                        .filter(w =>
                            !matchedLocalIds.has(w.id) &&
                            w.amount === t.amount &&
                            ['pending', 'processing'].includes(w.status || 'pending')
                        )
                        .map(w => ({
                            row: w,
                            distance: Math.abs(transferCreatedAt - new Date(w.created_at).getTime()),
                        }))
                        .filter(item => item.distance <= TERMINAL_TRANSFER_WINDOW_MS)
                        .sort((a, b) => a.distance - b.distance)[0]?.row;

                    if (match) {
                        matchedLocalIds.add(match.id);
                        const localDisplay = displayById.get(match.id);
                        if (localDisplay) {
                            localDisplay.status = terminalStatus;
                            localDisplay.pix_key = t.bank_account?.pix_key || t.bank_account?.account || localDisplay.pix_key || '-';
                        }

                        const now = new Date().toISOString();
                        const payload: Record<string, unknown> = {
                            status: terminalStatus,
                            pagarme_transfer_id: t.id,
                            updated_at: now,
                        };
                        if (terminalStatus === 'completed') payload.completed_at = now;

                        const { error } = await supabase
                            .from('withdrawals')
                            .update(payload)
                            .eq('id', match.id);

                        if (error) {
                            await supabase
                                .from('withdrawals')
                                .update({ status: terminalStatus })
                                .eq('id', match.id);
                        }

                        return null;
                    }

                    return {
                        id: t.id,
                        amount_display: (t.amount / 100).toFixed(2),
                        pix_key: t.bank_account?.pix_key || t.bank_account?.account || '-',
                        status: terminalStatus,
                        created_at: t.created_at,
                        source: 'pagarme',
                    };
                }));

            const merged = [...Array.from(displayById.values()), ...pagarmeTransfers.filter(Boolean)]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            return jsonSuccess({ withdrawals: merged });
        }
    } catch (err: any) {
        console.error('Pagar.me transfers fetch error:', err.response?.data || err.message);
    }

    return jsonSuccess({ withdrawals: localFormatted });
}

export async function POST(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Nao autorizado', 401);

    try {
        const ip =
            req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
            req.headers.get('x-real-ip') ||
            'unknown';

        const rlIp = await checkRateLimit({ key: `withdrawals:post:ip:${ip}`, limit: 10, windowSecs: 3600, failOpen: true });
        if (!rlIp.allowed) return rateLimitResponse(rlIp.resetAt);

        const rlUser = await checkRateLimit({ key: `withdrawals:post:user:${auth.user.id}`, limit: 5, windowSecs: 3600, failOpen: true });
        if (!rlUser.allowed) return rateLimitResponse(rlUser.resetAt);

        const { amount } = await req.json();
        if (!amount || amount <= 0) return jsonError('Valor invalido');

        const amountInCents = Math.round(amount * 100);
        const recentDuplicateWindow = new Date(Date.now() - 30_000).toISOString();

        const { data: recentDuplicate } = await supabase
            .from('withdrawals')
            .select('*')
            .eq('user_id', auth.user.id)
            .eq('amount', amountInCents)
            .in('status', ['pending', 'processing'])
            .gte('created_at', recentDuplicateWindow)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (recentDuplicate) {
            return jsonSuccess({ withdrawal: recentDuplicate, duplicate: true }, 200);
        }

        const { data: recipient } = await supabase
            .from('recipients')
            .select('pagarme_recipient_id')
            .eq('user_id', auth.user.id)
            .single();

        if (!recipient) return jsonError('Recebedor nao encontrado', 404);

        const balance = await PagarmeService.getRecipientBalance(recipient.pagarme_recipient_id);
        const availableAmount = balance.available_amount ?? (Array.isArray(balance.available) ? balance.available[0]?.amount : balance.available?.amount) ?? 0;

        const { data: reservedWithdrawals } = await supabase
            .from('withdrawals')
            .select('amount')
            .eq('user_id', auth.user.id)
            .in('status', ['pending', 'processing']);

        const reservedAmount = (reservedWithdrawals || []).reduce((sum, w) => sum + (w.amount || 0), 0);
        const availableAfterReserved = Math.max(0, availableAmount - reservedAmount);

        if (amountInCents + WITHDRAWAL_FEE_CENTS > availableAfterReserved) {
            return jsonError('Saldo insuficiente considerando saques pendentes e taxa de saque.', 400);
        }

        const { data: withdrawal, error: insertError } = await createPendingWithdrawal({
            userId: auth.user.id,
            amountInCents,
            pixKey: auth.user.pix_key,
            pixKeyType: auth.user.pix_key_type,
        });

        if (insertError || !withdrawal) {
            console.error('[WITHDRAWAL] Supabase insert error:', insertError);
            return jsonError(`Erro ao registrar saque: ${insertError?.message || 'falha desconhecida'}`, 500);
        }

        try {
            const { data: admins } = await supabase
                .from('users')
                .select('id')
                .eq('role', 'admin')
                .eq('status', 'active');

            const amountFormatted = new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
            }).format(amountInCents / 100);

            const sellerName = auth.user.name || 'Vendedor';
            const sellerEmail = auth.user.email || 'email nao informado';

            await Promise.allSettled((admins || []).map(admin =>
                sendPushNotification(admin.id, {
                    title: 'Nova solicitacao de saque',
                    body: `${amountFormatted} - ${sellerName} - ${sellerEmail}`,
                    url: '/admin/withdrawals',
                    icon: '/favicon.png',
                })
            ));
        } catch (pushError) {
            console.error('[WITHDRAWAL] Erro ao notificar admins:', pushError);
        }

        return jsonSuccess({ withdrawal }, 201);
    } catch (err: any) {
        const errorData = err.response?.data;
        console.error('Withdrawal error:', JSON.stringify(errorData || err.message, null, 2));

        let errorMessage = 'Erro ao processar saque';
        if (errorData?.message) {
            errorMessage = `Pagar.me: ${errorData.message}`;
        }

        return jsonError(errorMessage, 500);
    }
}
