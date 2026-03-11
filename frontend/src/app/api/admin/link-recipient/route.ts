export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { PagarmeService } from '@/lib/pagarme';

export async function POST(req: NextRequest) {
    try {
        const auth = await getAuthUser(req);
        if (!auth || auth.user.role !== 'admin') return jsonError('Não autorizado', 403);

        const body = await req.json();
        const email = String(body.email || '').toLowerCase().trim();
        const recipientId = String(body.recipient_id || '').trim();
        const desiredRole = String(body.role || '').trim();

        if (!email || !recipientId) return jsonError('Parâmetros inválidos (email, recipient_id)', 400);

        // Validate recipient exists on Pagar.me
        try {
            const rec = await PagarmeService.getRecipient(recipientId);
            if (!rec || !rec.id) return jsonError('Recebedor não encontrado no Pagar.me', 404);
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || 'Erro ao validar recebedor no Pagar.me';
            return jsonError(msg, 400);
        }

        // Find user by email
        const { data: user, error: userErr } = await supabase
            .from('users')
            .select('id, email, role')
            .ilike('email', email)
            .single();

        if (userErr || !user) return jsonError('Usuário não encontrado para o e-mail informado', 404);

        // Optionally elevate role to admin
        let finalRole = user.role;
        if (desiredRole && desiredRole.toLowerCase() === 'admin' && user.role !== 'admin') {
            const { error: roleErr } = await supabase
                .from('users')
                .update({ role: 'admin' })
                .eq('id', user.id);
            if (roleErr) return jsonError('Falha ao atualizar papel do usuário: ' + roleErr.message, 400);
            finalRole = 'admin';
        }

        // Upsert recipient linkage
        const { data: existing } = await supabase
            .from('recipients')
            .select('id, pagarme_recipient_id, status')
            .eq('user_id', user.id)
            .single();

        if (existing?.id) {
            const { error: updateErr } = await supabase
                .from('recipients')
                .update({ pagarme_recipient_id: recipientId, status: 'active' })
                .eq('id', existing.id);
            if (updateErr) return jsonError('Falha ao atualizar recebedor do usuário: ' + updateErr.message, 400);
        } else {
            const { error: insertErr } = await supabase
                .from('recipients')
                .insert({ user_id: user.id, pagarme_recipient_id: recipientId, status: 'active' });
            if (insertErr) return jsonError('Falha ao vincular recebedor ao usuário: ' + insertErr.message, 400);
        }

        return jsonSuccess({
            success: true,
            user: { id: user.id, email: user.email, role: finalRole },
            recipient_id: recipientId,
            message: 'Recebedor vinculado com sucesso ao usuário'
        });
    } catch (error: any) {
        return jsonError(error.message || 'Erro interno', 500);
    }
}
