export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { jsonError, jsonSuccess } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
    try {
        const { token, password } = await req.json();

        if (!token) return jsonError('Token é obrigatório');
        if (!password || password.length < 6) {
            return jsonError('Senha deve ter no mínimo 6 caracteres');
        }

        // Find user by reset token
        const { data: users, error: findError } = await supabase
            .from('users')
            .select('*')
            .eq('password_reset_token', token);

        if (findError || !users || users.length === 0) {
            return jsonError('Token inválido ou expirado', 400);
        }

        const user = users[0];

        // Check if token is expired
        if (!user.password_reset_expires || new Date(user.password_reset_expires) < new Date()) {
            return jsonError('Token expirado. Solicite um novo link de recuperação.', 400);
        }

        // Hash new password
        const password_hash = await bcrypt.hash(password, 12);

        // Update password and clear reset token
        const { error: updateError } = await supabase
            .from('users')
            .update({
                password_hash,
                password_reset_token: null,
                password_reset_expires: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

        if (updateError) {
            console.error('Error updating password:', updateError);
            return jsonError('Erro ao atualizar senha', 500);
        }

        return jsonSuccess({ message: 'Senha alterada com sucesso!' });
    } catch (err) {
        console.error('Reset password error:', err);
        return jsonError('Erro interno do servidor', 500);
    }
}
