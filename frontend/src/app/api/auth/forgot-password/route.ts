export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { jsonError, jsonSuccess } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        if (!email) return jsonError('Email é obrigatório');

        // Check if user exists
        const { data: users } = await supabase
            .from('users')
            .select('id, name, email')
            .eq('email', email);

        const user = users?.[0];

        // If user exists, generate reset token
        if (user) {
            const resetToken = uuidv4();
            const resetExpires = new Date(Date.now() + 3600000); // 1 hour

            const { error } = await supabase
                .from('users')
                .update({
                    password_reset_token: resetToken,
                    password_reset_expires: resetExpires.toISOString()
                })
                .eq('id', user.id);

            if (!error) {
                // Build reset URL
                const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
                
                // Log for development (in production, send actual email)
                console.log('\n=== PASSWORD RESET REQUEST ===');
                console.log('Email:', email);
                console.log('Reset URL:', resetUrl);
                console.log('Token:', resetToken);
                console.log('Expires:', new Date(Date.now() + 3600000).toISOString());
                console.log('==============================\n');

                // TODO: Send email via backend API or email service
                // For now, we're just logging it
            }
        }

        // Always return success for security (don't reveal if email exists)
        return jsonSuccess({ 
            message: 'Se o email existir, as instruções de recuperação serão enviadas.',
            // Only include resetUrl in development
            ...(process.env.NODE_ENV === 'development' && user ? { 
                resetUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${user.password_reset_token}` 
            } : {})
        });
    } catch (err) {
        console.error('Forgot password error:', err);
        return jsonError('Erro interno do servidor', 500);
    }
}
