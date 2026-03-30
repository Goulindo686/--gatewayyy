const rateLimit = require('express-rate-limit');

/**
 * Limitador para Checkout (anti-abuso / carding)
 * Por IP: 10 tentativas a cada hora
 */
const checkoutLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 10,
    message: { error: 'Muitas tentativas de pagamento. Tente novamente em 1 hora.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Usa IP real mesmo atrás de proxy/Vercel/Cloudflare
        return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    }
});

/**
 * Limitador por email do comprador (anti-carding por email)
 * Mesmo email: 5 tentativas a cada hora
 */
const checkoutEmailLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 5,
    message: { error: 'Muitas tentativas de pagamento para este email. Tente novamente em 1 hora.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const email = req.body?.buyer?.email?.toLowerCase().trim() || 'unknown';
        return `email:${email}`;
    },
    skip: (req) => !req.body?.buyer?.email // Pula se não tiver email (validação cuida disso)
});

/**
 * Limitador para tentativas de Login
 * 10 tentativas a cada 15 minutos
 */
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10,
    message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Limitador para Criação de Contas (Registro)
 * 5 cadastros por hora (evita bots)
 */
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 5,
    message: { error: 'Limite de criação de contas excedido para este IP. Tente novamente em 1 hora.' },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Limitador para Recuperação de Senha
 * 3 pedidos por hora
 */
const forgotPasswordLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3,
    message: { error: 'Muitos pedidos de recuperação. Tente novamente mais tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    loginLimiter,
    registerLimiter,
    forgotPasswordLimiter,
    checkoutLimiter,
    checkoutEmailLimiter
};
