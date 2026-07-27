import nodemailer from 'nodemailer';

const DEFAULT_SMTP_HOST = 'smtpout.secureserver.net';
const DEFAULT_SMTP_PORT = 465;

type SmtpConfiguration = {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    from: string;
};

export type SmtpConfigurationSummary = Omit<SmtpConfiguration, 'pass' | 'user'> & {
    userMasked: string;
};

export class SmtpConfigurationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SmtpConfigurationError';
    }
}

function parsePort(value: string | undefined) {
    if (!value) return DEFAULT_SMTP_PORT;

    const port = Number(value);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new SmtpConfigurationError('SMTP_PORT deve ser uma porta valida entre 1 e 65535');
    }

    return port;
}

function parseSecure(value: string | undefined, port: number) {
    if (!value) return port === 465;

    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'sim'].includes(normalized)) return true;
    if (['false', '0', 'no', 'nao'].includes(normalized)) return false;

    throw new SmtpConfigurationError('SMTP_SECURE deve ser true ou false');
}

function formatFromAddress(value: string | undefined, user: string) {
    const from = value?.trim();
    if (!from) return `"GouPay" <${user}>`;
    if (/[\r\n]/.test(from)) {
        throw new SmtpConfigurationError('SMTP_FROM contem caracteres invalidos');
    }
    if (from.includes('<')) return from;
    return `"GouPay" <${from}>`;
}

function maskEmail(value: string) {
    const [localPart, domain] = value.split('@');
    if (!domain) return '***';
    return `${localPart.slice(0, 2)}***@${domain}`;
}

function readSmtpConfiguration(): SmtpConfiguration {
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS;
    const missing = [
        !user ? 'SMTP_USER' : null,
        !pass ? 'SMTP_PASS' : null,
    ].filter(Boolean);

    if (missing.length > 0) {
        throw new SmtpConfigurationError(
            `SMTP nao configurado. Defina: ${missing.join(', ')}`
        );
    }

    const host = process.env.SMTP_HOST?.trim() || DEFAULT_SMTP_HOST;
    const port = parsePort(process.env.SMTP_PORT);
    const secure = parseSecure(process.env.SMTP_SECURE, port);

    return {
        host,
        port,
        secure,
        user: user as string,
        pass: pass as string,
        from: formatFromAddress(process.env.SMTP_FROM, user as string),
    };
}

function summarizeConfiguration(config: SmtpConfiguration): SmtpConfigurationSummary {
    return {
        host: config.host,
        port: config.port,
        secure: config.secure,
        from: config.from,
        userMasked: maskEmail(config.user),
    };
}

export function getSmtpConfigurationSummary() {
    return summarizeConfiguration(readSmtpConfiguration());
}

export function createSmtpClient() {
    const config = readSmtpConfiguration();
    const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        requireTLS: !config.secure,
        auth: {
            user: config.user,
            pass: config.pass,
        },
        tls: {
            minVersion: 'TLSv1.2',
            rejectUnauthorized: true,
        },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
    });

    return {
        transporter,
        from: config.from,
        summary: summarizeConfiguration(config),
    };
}

export async function verifySmtpConnection() {
    const { transporter, summary } = createSmtpClient();
    await transporter.verify();
    return summary;
}

export async function sendSmtpDiagnosticEmail(to: string) {
    const recipient = to.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
        throw new Error('Informe um email valido para receber o teste');
    }

    const { transporter, from, summary } = createSmtpClient();
    const info = await transporter.sendMail({
        from,
        to: recipient,
        subject: 'Teste de configuracao de email - GouPay',
        text: 'O envio SMTP da GouPay esta funcionando corretamente.',
        html: `
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#1d2433">
                <h1 style="font-size:24px">Email configurado com sucesso</h1>
                <p>O envio SMTP da GouPay esta funcionando corretamente.</p>
                <p style="color:#697386;font-size:13px">Esta mensagem foi gerada pelo diagnostico de email do projeto.</p>
            </div>
        `,
    });

    return {
        ...summary,
        messageId: info.messageId,
        accepted: info.accepted.map(String),
        rejected: info.rejected.map(String),
    };
}
