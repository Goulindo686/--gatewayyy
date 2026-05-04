export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { jsonError, jsonSuccess } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        if (!email) return jsonError('Email é obrigatório');

        // Create Supabase client with anon key for auth operations
        const supabaseAuth = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Use Supabase Auth to send password reset email
        // This will automatically send an email using Supabase's email service
        const { error: authError } = await supabaseAuth.auth.resetPasswordForEmail(email, {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password`,
        });

        if (authError) {
            console.error('[FORGOT PASSWORD] Supabase Auth error:', authError);
            // Don't reveal the error to prevent email enumeration
        }

        // Also update our custom users table for backward compatibility
        // This allows us to track reset requests in our own database
        const { data: users } = await supabase
            .from('users')
            .select('id, email')
            .eq('email', email);

        if (users && users.length > 0) {
            const { v4: uuidv4 } = require('uuid');
            const resetToken = uuidv4();
            const resetExpires = new Date(Date.now() + 3600000); // 1 hour

            await supabase
                .from('users')
                .update({
                    password_reset_token: resetToken,
                    password_reset_expires: resetExpires.toISOString()
                })
                .eq('id', users[0].id);

            console.log('[FORGOT PASSWORD] Reset email sent via Supabase Auth to:', email);
        }

        // Always return success for security (don't reveal if email exists)
        return jsonSuccess({ 
            message: 'Se o email existir, as instruções de recuperação serão enviadas.',
            info: 'Email enviado via Supabase Auth. Verifique sua caixa de entrada.'
        });
    } catch (err) {
        console.error('Forgot password error:', err);
        return jsonError('Erro interno do servidor', 500);
    }
}
