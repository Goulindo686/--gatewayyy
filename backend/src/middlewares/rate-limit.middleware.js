const rateLimit = require('express-rate-limit');

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
    forgotPasswordLimiter
};
