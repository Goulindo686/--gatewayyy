export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { jsonError, jsonSuccess } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
    try {
        const { token, password } = await req.json();

        if (!token) return jsonError('Token é obrigatório');
        if (!password || password.length < 6) {
            return jsonError('Senha deve ter no mínimo 6 caracteres');
        }

        // Try Supabase Auth first (if token looks like a JWT)
        if (token.includes('.')) {
            try {
                const supabaseAuth = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                );

                // Update password using Supabase Auth
                const { error: authError } = await supabaseAuth.auth.updateUser({
                    password: password
                });

                if (!authError) {
                    console.log('[RESET PASSWORD] Password updated via Supabase Auth');
                    
                    // Also update our custom users table for consistency
                    const { data: { user } } = await supabaseAuth.auth.getUser(token);
                    if (user) {
                        const password_hash = await bcrypt.hash(password, 12);
                        await supabase
                            .from('users')
                            .update({
                                password_hash,
                                password_reset_token: null,
                                password_reset_expires: null,
                                updated_at: new Date().toISOString()
                            })
                            .eq('email', user.email);
                    }

                    return jsonSuccess({ message: 'Senha alterada com sucesso!' });
                }
            } catch (authErr) {
                console.log('[RESET PASSWORD] Not a Supabase Auth token, trying custom token...');
            }
        }

        // Fallback to custom token system
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

        console.log('[RESET PASSWORD] Password updated via custom token');
        return jsonSuccess({ message: 'Senha alterada com sucesso!' });
    } catch (err) {
        console.error('Reset password error:', err);
        return jsonError('Erro interno do servidor', 500);
    }
}
