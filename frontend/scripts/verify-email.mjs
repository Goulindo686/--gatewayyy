import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const { sendSmtpDiagnosticEmail, verifySmtpConnection } = await import('../src/lib/smtp.ts');

const recipient = process.argv[2]?.trim();

try {
    if (recipient) {
        const result = await sendSmtpDiagnosticEmail(recipient);
        console.log('[EMAIL] Conexao SMTP e envio confirmados.');
        console.log(`[EMAIL] Servidor: ${result.host}:${result.port} (secure=${result.secure})`);
        console.log(`[EMAIL] Remetente: ${result.from}`);
        console.log(`[EMAIL] Aceitos: ${result.accepted.join(', ') || 'nenhum'}`);
        console.log(`[EMAIL] Rejeitados: ${result.rejected.join(', ') || 'nenhum'}`);
        console.log(`[EMAIL] Message ID: ${result.messageId}`);
    } else {
        const result = await verifySmtpConnection();
        console.log('[EMAIL] Autenticacao SMTP confirmada.');
        console.log(`[EMAIL] Servidor: ${result.host}:${result.port} (secure=${result.secure})`);
        console.log(`[EMAIL] Usuario: ${result.userMasked}`);
        console.log(`[EMAIL] Remetente: ${result.from}`);
        console.log('[EMAIL] Para testar a entrega, execute: npm run email:verify -- destinatario@email.com');
    }
} catch (error) {
    const smtpError = error;

    console.error('[EMAIL] Falha no diagnostico SMTP.');
    console.error(`[EMAIL] Mensagem: ${smtpError.message || String(error)}`);
    if (smtpError.code) console.error(`[EMAIL] Codigo: ${smtpError.code}`);
    if (smtpError.command) console.error(`[EMAIL] Comando: ${smtpError.command}`);
    if (smtpError.response) console.error(`[EMAIL] Resposta SMTP: ${smtpError.response}`);
    process.exitCode = 1;
}
