'use client';

export type CardTokenInput = {
    number: string;
    holderName: string;
    expMonth: number;
    expYear: number;
    cvv: string;
};

type PagarmeTokenResponse = {
    id?: string;
    message?: string;
    errors?: Record<string, string[] | string>;
};

export class CardTokenizationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CardTokenizationError';
    }
}

function getTokenizationError(payload: PagarmeTokenResponse | null) {
    if (payload?.message) return payload.message;
    if (payload?.errors) {
        const firstError = Object.values(payload.errors).flatMap(value => Array.isArray(value) ? value : [value])[0];
        if (firstError) return firstError;
    }
    return 'Nao foi possivel validar o cartao. Confira os dados e tente novamente.';
}

/**
 * Tokeniza o cartao diretamente no Pagar.me. Numero e CVV nunca passam pela API da GouPay.
 */
export async function tokenizePagarmeCard(publicKey: string, input: CardTokenInput) {
    if (!/^pk_(test|live)_/i.test(publicKey || '')) {
        throw new CardTokenizationError('Pagamento por cartao ainda nao foi configurado pelo estabelecimento.');
    }

    let response: Response;
    try {
        response = await fetch(`https://api.pagar.me/core/v5/tokens?appId=${encodeURIComponent(publicKey)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'card',
                card: {
                    number: input.number.replace(/\D/g, ''),
                    holder_name: input.holderName.trim(),
                    exp_month: input.expMonth,
                    exp_year: input.expYear,
                    cvv: input.cvv.replace(/\D/g, ''),
                },
            }),
        });
    } catch {
        throw new CardTokenizationError('Nao foi possivel conectar ao ambiente seguro do Pagar.me. Tente novamente.');
    }

    let payload: PagarmeTokenResponse | null = null;
    try {
        payload = await response.json() as PagarmeTokenResponse;
    } catch {
        // A mensagem generica abaixo evita expor respostas inesperadas do provedor.
    }

    if (!response.ok || !payload?.id?.startsWith('token_')) {
        throw new CardTokenizationError(getTokenizationError(payload));
    }

    return payload.id;
}

export function createCheckoutSessionId() {
    if (typeof window === 'undefined') return '';

    const storageKey = 'goupay_checkout_session';
    const existing = window.sessionStorage.getItem(storageKey);
    if (existing && /^[a-zA-Z0-9-]{8,64}$/.test(existing)) return existing;

    const value = typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
    window.sessionStorage.setItem(storageKey, value);
    return value;
}

export function getCheckoutDevicePlatform() {
    if (typeof navigator === 'undefined') return 'UNKNOWN';
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('android')) return 'ANDROID';
    if (/iphone|ipad|ipod/.test(ua)) return 'IOS';
    if (ua.includes('windows')) return 'WINDOWS';
    if (ua.includes('mac os')) return 'MACOS';
    if (ua.includes('linux')) return 'LINUX';
    return 'WEB';
}
