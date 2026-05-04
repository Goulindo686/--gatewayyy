const { supabase } = require('../config/database');

class EmailService {
    /**
     * Send password reset email
     * Uses Supabase's built-in email service or custom SMTP
     */
    async sendPasswordResetEmail(email, resetToken, userName) {
        try {
            // Build reset URL
            const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

            // Email HTML template
            const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recuperação de Senha</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f7;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f7; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">🔐 Recuperação de Senha</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="margin: 0 0 20px; color: #1d1d1f; font-size: 16px; line-height: 1.6;">
                                Olá <strong>${userName || 'usuário'}</strong>,
                            </p>
                            <p style="margin: 0 0 20px; color: #1d1d1f; font-size: 16px; line-height: 1.6;">
                                Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha:
                            </p>
                            
                            <!-- Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="${resetUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                                            Redefinir Minha Senha
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 20px 0; color: #86868b; font-size: 14px; line-height: 1.6;">
                                Ou copie e cole este link no seu navegador:
                            </p>
                            <p style="margin: 0 0 20px; padding: 12px; background-color: #f5f5f7; border-radius: 8px; color: #667eea; font-size: 13px; word-break: break-all; font-family: monospace;">
                                ${resetUrl}
                            </p>
                            
                            <div style="margin: 30px 0; padding: 16px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 8px;">
                                <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;">
                                    ⚠️ <strong>Importante:</strong> Este link expira em 1 hora por segurança.
                                </p>
                            </div>
                            
                            <p style="margin: 20px 0 0; color: #86868b; font-size: 14px; line-height: 1.6;">
                                Se você não solicitou a redefinição de senha, ignore este email. Sua senha permanecerá inalterada.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background-color: #f5f5f7; border-top: 1px solid #e5e5e7;">
                            <p style="margin: 0 0 10px; color: #86868b; font-size: 13px; text-align: center;">
                                Gateway de Pagamentos
                            </p>
                            <p style="margin: 0; color: #86868b; font-size: 12px; text-align: center;">
                                Este é um email automático, por favor não responda.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
            `.trim();

            const textContent = `
Recuperação de Senha

Olá ${userName || 'usuário'},

Recebemos uma solicitação para redefinir a senha da sua conta.

Para criar uma nova senha, acesse o link abaixo:
${resetUrl}

⚠️ IMPORTANTE: Este link expira em 1 hora por segurança.

Se você não solicitou a redefinição de senha, ignore este email. Sua senha permanecerá inalterada.

---
Gateway de Pagamentos
Este é um email automático, por favor não responda.
            `.trim();

            // Log for development (in production, you would send via SMTP or Supabase Edge Functions)
            console.log('\n=== EMAIL DE RECUPERAÇÃO DE SENHA ===');
            console.log('Para:', email);
            console.log('Assunto: Recuperação de Senha');
            console.log('Link de Reset:', resetUrl);
            console.log('Token:', resetToken);
            console.log('=====================================\n');

            // TODO: Implement actual email sending
            // Option 1: Use Supabase Edge Functions with Resend/SendGrid
            // Option 2: Use nodemailer with SMTP
            // Option 3: Use a third-party service like SendGrid, Mailgun, etc.

            // For now, we'll just log it. In production, uncomment one of the methods below:

            /*
            // Example with nodemailer (requires: npm install nodemailer)
            const nodemailer = require('nodemailer');
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT,
                secure: true,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });

            await transporter.sendMail({
                from: process.env.SMTP_FROM || 'noreply@goupay.com.br',
                to: email,
                subject: 'Recuperação de Senha - Gateway de Pagamentos',
                text: textContent,
                html: htmlContent
            });
            */

            return {
                success: true,
                message: 'Email enviado com sucesso',
                resetUrl // Only for development/testing
            };
        } catch (error) {
            console.error('Error sending password reset email:', error);
            throw error;
        }
    }

    /**
     * Send welcome email
     */
    async sendWelcomeEmail(email, userName) {
        console.log(`[EMAIL] Welcome email would be sent to: ${email} (${userName})`);
        // TODO: Implement welcome email
    }

    /**
     * Send email verification
     */
    async sendVerificationEmail(email, verificationToken, userName) {
        const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
        
        console.log('\n=== EMAIL DE VERIFICAÇÃO ===');
        console.log('Para:', email);
        console.log('Link de Verificação:', verificationUrl);
        console.log('============================\n');

        // TODO: Implement actual email sending
        return { success: true, verificationUrl };
    }
}

module.exports = new EmailService();
