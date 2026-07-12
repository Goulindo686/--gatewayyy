export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { PagarmeService } from '@/lib/pagarme';

async function updateWithdrawalWithFallback(id: string, payload: Record<string, unknown>) {
    const { data, error } = await supabase
        .from('withdrawals')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

    if (!error) return { data, error: null };

    const message = `${error.message || ''} ${error.details || ''}`.toLowerCase();
    const hasOptionalColumnIssue =
        message.includes('schema cache') ||
        message.includes('column') ||
        message.includes('updated_at') ||
        message.includes('failure_reason');

    if (!hasOptionalColumnIssue) return { data: null, error };

    const minimalPayload: Record<string, unknown> = {};
    if ('status' in payload) minimalPayload.status = payload.status;
    if ('pagarme_transfer_id' in payload) minimalPayload.pagarme_transfer_id = payload.pagarme_transfer_id;
    if ('completed_at' in payload) minimalPayload.completed_at = payload.completed_at;

    return supabase
        .from('withdrawals')
        .update(minimalPayload)
        .eq('id', id)
        .select()
        .single();
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await getAuthUser(req);
    if (!auth || auth.user.role !== 'admin') return jsonError('Nao autorizado', 403);

    const { id } = await params;

    try {
        const ip =
            req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
            req.headers.get('x-real-ip') ||
            'unknown';
        const rl = await checkRateLimit({ key: `admin:withdrawals:approve:${auth.user.id}:${ip}`, limit: 30, windowSecs: 60, failOpen: true });
        if (!rl.allowed) return rateLimitResponse(rl.resetAt);

        const { data: withdrawal, error: withdrawalError } = await supabase
            .from('withdrawals')
            .select('*')
            .eq('id', id)
            .single();

        if (withdrawalError || !withdrawal) return jsonError('Saque nao encontrado', 404);
        if (withdrawal.status !== 'pending') return jsonError('Este saque nao esta pendente para aprovacao', 400);

        const { data: recipient, error: recipientError } = await supabase
            .from('recipients')
            .select('pagarme_recipient_id')
            .eq('user_id', withdrawal.user_id)
            .single();

        if (recipientError || !recipient?.pagarme_recipient_id) {
            return jsonError('Recebedor do vendedor nao encontrado', 404);
        }

        const { data: lockedWithdrawal, error: lockError } = await supabase
            .from('withdrawals')
            .update({ status: 'processing' })
            .eq('id', withdrawal.id)
            .eq('status', 'pending')
            .select()
            .single();

        if (lockError || !lockedWithdrawal) {
            const { data: latestWithdrawal } = await supabase
                .from('withdrawals')
                .select('*')
                .eq('id', withdrawal.id)
                .single();

            if (latestWithdrawal?.status === 'processing' || latestWithdrawal?.status === 'completed') {
                return jsonSuccess({
                    message: 'Este saque ja foi enviado para processamento',
                    withdrawal: latestWithdrawal,
                });
            }

            return jsonError(lockError?.message || 'Este saque ja esta em processamento ou nao esta mais pendente', 409);
        }

        let transfer;
        try {
            transfer = await PagarmeService.createTransfer(recipient.pagarme_recipient_id, withdrawal.amount);
        } catch (transferError: unknown) {
            const error = transferError as { response?: { data?: { message?: string } }; message?: string };
            await updateWithdrawalWithFallback(withdrawal.id, {
                status: 'pending',
                failure_reason: error.response?.data?.message || error.message || 'Falha ao criar transferencia no Pagar.me',
                updated_at: new Date().toISOString(),
            });
            throw transferError;
        }

        const { data: updatedWithdrawal, error: updateError } = await updateWithdrawalWithFallback(withdrawal.id, {
            pagarme_transfer_id: transfer.id,
            updated_at: new Date().toISOString(),
        });

        if (updateError) {
            console.warn('[ADMIN WITHDRAWAL APPROVE] Transferencia criada, mas falhou ao salvar pagarme_transfer_id:', updateError.message);
        }

        const { error: transactionError } = await supabase.from('transactions').insert({
            id: uuidv4(),
            user_id: withdrawal.user_id,
            type: 'withdrawal',
            amount: withdrawal.amount,
            status: 'pending',
            description: `Saque aprovado aguardando confirmacao Pagar.me: R$ ${(withdrawal.amount / 100).toFixed(2)}`,
            pagarme_transaction_id: transfer.id,
        });
        if (transactionError) {
            console.warn('[ADMIN WITHDRAWAL APPROVE] Falha ao registrar transacao de saque:', transactionError.message);
        }

        return jsonSuccess({
            message: updateError
                ? 'Saque enviado ao Pagar.me. A confirmacao sera sincronizada pelo webhook.'
                : 'Saque aprovado e enviado para processamento no Pagar.me',
            withdrawal: updatedWithdrawal || lockedWithdrawal,
        });
    } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string } }; message?: string };
        console.error('[ADMIN WITHDRAWAL APPROVE]', error.response?.data || error.message || error);
        return jsonError(error.response?.data?.message || error.message || 'Erro ao aprovar saque', 500);
    }
}
