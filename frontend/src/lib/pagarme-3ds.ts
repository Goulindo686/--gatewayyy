'use client';

import { CardTokenizationError } from '@/lib/pagarme-card';

type ThreeDSInput = {
    amountCents: number;
    customer: {
        name: string;
        email: string;
        cpf: string;
        phone: string;
    };
    card: {
        number: string;
        holderName: string;
        expMonth: number;
        expYear: number;
    };
    billingAddress: {
        line_1: string;
        zip_code: string;
        city: string;
        state: string;
        country?: string;
    };
    items: Array<{
        description: string;
        code: string;
    }>;
};

type ThreeDSTokenResponse = {
    enabled?: boolean;
    required?: boolean;
    token?: string;
    library_url?: string;
    reason?: 'disabled' | 'not_configured' | 'provider_unavailable';
};

type ThreeDSResult = {
    tds_server_trans_id?: string;
    tdsServerTransID?: string;
    transaction_id?: string;
    trans_status?: string;
    transStatus?: string;
    challenge_canceled?: boolean;
};

declare global {
    interface Window {
        TDS?: {
            init: (config: Record<string, unknown>, order: Record<string, unknown>) => Promise<ThreeDSResult[] | ThreeDSResult>;
        };
    }
}

const SCRIPT_ID = 'pagarme-3ds-script';

function onlyDigits(value: string) {
    return String(value || '').replace(/\D/g, '');
}

function supportsStone3DS(cardNumber: string) {
    const digits = onlyDigits(cardNumber);
    if (/^4\d{12}(?:\d{3})?(?:\d{3})?$/.test(digits)) return true;

    const firstTwo = Number(digits.slice(0, 2));
    const firstFour = Number(digits.slice(0, 4));
    return (firstTwo >= 51 && firstTwo <= 55)
        || (firstFour >= 2221 && firstFour <= 2720);
}

function phoneParts(phone: string) {
    const digits = onlyDigits(phone);
    return {
        country_code: '55',
        area_code: digits.slice(0, 2) || '11',
        number: digits.slice(2) || '999999999',
    };
}

function ensureContainer(id: string, hidden = false) {
    let element = document.getElementById(id);
    if (!element) {
        element = document.createElement('div');
        element.id = id;
        document.body.appendChild(element);
    }

    if (hidden) {
        element.style.display = 'none';
    } else {
        element.style.display = 'block';
        element.style.position = 'relative';
        element.style.zIndex = '2147483647';
    }

    return element;
}

async function requestThreeDSData(body: Record<string, unknown>): Promise<ThreeDSTokenResponse | null> {
    try {
        const response = await fetch('/api/checkout/3ds-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            cache: 'no-store',
        });
        if (!response.ok) return null;
        return await response.json() as ThreeDSTokenResponse;
    } catch {
        return null;
    }
}

function getThreeDSConfig() {
    return requestThreeDSData({ config_only: true });
}

function getThreeDSToken() {
    return requestThreeDSData({});
}

function reportThreeDSError(details: { code: string; status?: number; message: string }) {
    void fetch('/api/checkout/3ds-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'report',
            code: details.code,
            status: details.status,
            message: details.message,
            path: window.location.pathname,
        }),
        keepalive: true,
    }).catch(() => null);
}

async function loadThreeDSScript(libraryUrl: string) {
    if (typeof window === 'undefined') return false;
    if (window.TDS?.init) return true;

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
        existing.remove();
    }

    await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.id = SCRIPT_ID;
        script.src = libraryUrl;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('3DS script failed'));
        document.head.appendChild(script);
    }).catch(() => null);

    return !!window.TDS?.init;
}

function threeDSErrorDetails(error: unknown) {
    const candidate = error as {
        message?: unknown;
        getCode?: () => unknown;
        getStatus?: () => unknown;
    };

    let code = '';
    let status: number | undefined;
    try {
        code = String(candidate?.getCode?.() || '').toUpperCase();
        const rawStatus = Number(candidate?.getStatus?.());
        if (Number.isFinite(rawStatus)) status = rawStatus;
    } catch {
        // Alguns navegadores podem bloquear a leitura de detalhes do iframe do emissor.
    }

    return {
        code,
        status,
        message: typeof candidate?.message === 'string' ? candidate.message.slice(0, 200) : '',
    };
}

function hideContainer(element: HTMLElement) {
    element.style.display = 'none';
}

function wait(milliseconds: number) {
    return new Promise(resolve => window.setTimeout(resolve, milliseconds));
}

function isRetryable3DSError(details: { code: string; status?: number; message: string }) {
    return details.status != null && details.status >= 500
        || /(INVALID.*JWT|JWT.*INVALID|TOKEN.*EXPIR|TDS_RESPONSE_ERROR|BAD_GATEWAY|SERVICE_UNAVAILABLE|INTERNAL_SERVER_ERROR)/i
            .test(`${details.code} ${details.message}`);
}

function buildOrder(input: ThreeDSInput) {
    const customerPhone = phoneParts(input.customer.phone);

    return {
        customer: {
            name: input.customer.name,
            email: input.customer.email,
            document: onlyDigits(input.customer.cpf),
            phones: {
                mobile_phone: customerPhone,
            },
        },
        items: input.items.map((item) => ({
            description: item.description.slice(0, 256),
            code: item.code.slice(0, 52),
        })),
        payments: [{
            payment_method: 'credit_card',
            amount: input.amountCents,
            credit_card: {
                card: {
                    number: onlyDigits(input.card.number),
                    holder_name: input.card.holderName.trim(),
                    exp_month: input.card.expMonth,
                    exp_year: input.card.expYear,
                    billing_address: {
                        line_1: input.billingAddress.line_1,
                        line_2: 'Sem complemento',
                        zip_code: onlyDigits(input.billingAddress.zip_code),
                        city: input.billingAddress.city,
                        state: input.billingAddress.state,
                        country: input.billingAddress.country || 'BR',
                    },
                },
            },
        }],
        shipping: {
            recipient_name: input.customer.name,
            electronic_delivery: true,
        },
        requestor_url: window.location.href,
    };
}

export async function authenticatePagarme3DS(input: ThreeDSInput) {
    if (typeof window === 'undefined') return null;

    // O 3DS Stone e suportado para Visa e Mastercard. Outras bandeiras seguem
    // pelo antifraude normal do Pagar.me, sem serem bloqueadas por esta camada.
    if (!supportsStone3DS(input.card.number)) return null;

    // A biblioteca e carregada antes da emissao do token, que expira rapidamente.
    // Assim o token e solicitado somente no instante anterior ao TDS.init.
    const config = await getThreeDSConfig();
    const required = config?.required === true;
    if (config?.reason === 'disabled') return null;
    if (!config?.enabled || !config.library_url) {
        if (required) {
            throw new CardTokenizationError('Nao foi possivel iniciar a autenticacao segura do cartao. Tente novamente em alguns minutos ou utilize o Pix.');
        }
        return null;
    }

    const loaded = await loadThreeDSScript(config.library_url);
    if (!loaded || !window.TDS?.init) {
        if (required) {
            throw new CardTokenizationError('Nao foi possivel carregar a autenticacao segura do cartao. Recarregue a pagina e tente novamente.');
        }
        return null;
    }

    const methodContainer = ensureContainer('pagarme-3ds-method-container', true);
    const challengeContainer = ensureContainer('pagarme-3ds-challenge-container');

    let response: ThreeDSResult[] | ThreeDSResult | null = null;
    try {
        for (let attempt = 0; attempt < 2; attempt += 1) {
            const tokenData = await getThreeDSToken();
            if (!tokenData?.enabled || !tokenData.token) {
                if (attempt === 0) {
                    await wait(250);
                    continue;
                }
                if (required) {
                    throw new CardTokenizationError('Nao foi possivel iniciar a autenticacao segura do cartao. Tente novamente em alguns minutos.');
                }
                return null;
            }

            try {
                response = await window.TDS.init({
                    token: tokenData.token,
                    tds_method_container_element: methodContainer,
                    challenge_container_element: challengeContainer,
                    use_default_challenge_iframe_style: true,
                    challenge_window_size: '03',
                }, buildOrder(input));
                break;
            } catch (error) {
                const details = threeDSErrorDetails(error);
                reportThreeDSError(details);
                console.error('[3DS] Authentication failed:', details);

                if (details.code === 'UNAUTHORIZED' || details.code === 'BIN_FRAUD_SUSPECT') {
                    throw new CardTokenizationError('Este cartao nao passou pela autenticacao de seguranca. Utilize outro cartao ou o Pix.');
                }

                if (attempt === 0 && isRetryable3DSError(details)) {
                    await wait(350);
                    continue;
                }

                if (required) {
                    const reference = details.code ? ` Codigo: ${details.code}.` : '';
                    throw new CardTokenizationError(`Nao foi possivel concluir a autenticacao segura do cartao.${reference} Tente novamente em alguns minutos.`);
                }
                return null;
            }
        }
    } finally {
        hideContainer(methodContainer);
        hideContainer(challengeContainer);
    }

    if (!response) return null;

    const result = Array.isArray(response) ? response[0] : response;
    const status = String(result?.trans_status || result?.transStatus || '').toUpperCase();
    const transactionId = String(result?.tds_server_trans_id || result?.tdsServerTransID || result?.transaction_id || '');

    if (result?.challenge_canceled) {
        throw new CardTokenizationError('A autenticacao do cartao foi cancelada. Tente novamente ou utilize o Pix.');
    }

    if (status === 'N' || status === 'R') {
        throw new CardTokenizationError('A autenticacao do cartao foi recusada pelo banco. Tente outro cartao ou utilize o Pix.');
    }

    if ((status === 'Y' || status === 'A' || status === 'C') && /^[a-zA-Z0-9_-]{8,128}$/.test(transactionId)) {
        return transactionId;
    }

    if (status === 'U' && required) {
        throw new CardTokenizationError('A autenticacao do banco esta indisponivel no momento. Tente novamente em alguns minutos.');
    }

    if (required) {
        throw new CardTokenizationError('O banco nao concluiu a autenticacao deste cartao. Tente outro cartao ou utilize o Pix.');
    }

    return null;
}
