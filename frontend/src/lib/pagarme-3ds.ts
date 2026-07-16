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
    token?: string;
    library_url?: string;
};

type ThreeDSResult = {
    tds_server_trans_id?: string;
    tdsServerTransID?: string;
    transaction_id?: string;
    trans_status?: string;
    transStatus?: string;
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

async function getThreeDSToken(): Promise<ThreeDSTokenResponse | null> {
    try {
        const response = await fetch('/api/checkout/3ds-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
        });
        if (!response.ok) return null;
        return await response.json() as ThreeDSTokenResponse;
    } catch {
        return null;
    }
}

async function loadThreeDSScript(libraryUrl: string) {
    if (typeof window === 'undefined') return false;
    if (window.TDS?.init) return true;

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
        await new Promise<void>((resolve, reject) => {
            existing.addEventListener('load', () => resolve(), { once: true });
            existing.addEventListener('error', () => reject(new Error('3DS script failed')), { once: true });
        }).catch(() => null);
        return !!window.TDS?.init;
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

    const tokenData = await getThreeDSToken();
    if (!tokenData?.enabled || !tokenData.token || !tokenData.library_url) return null;

    const loaded = await loadThreeDSScript(tokenData.library_url);
    if (!loaded || !window.TDS?.init) return null;

    const methodContainer = ensureContainer('pagarme-3ds-method-container', true);
    const challengeContainer = ensureContainer('pagarme-3ds-challenge-container');

    let response: ThreeDSResult[] | ThreeDSResult;
    try {
        response = await window.TDS.init({
            token: tokenData.token,
            tds_method_container_element: methodContainer,
            challenge_container_element: challengeContainer,
            use_default_challenge_iframe_style: true,
            challenge_window_size: '03',
        }, buildOrder(input));
    } catch (error) {
        console.warn('[3DS] Authentication unavailable, continuing without 3DS:', error);
        return null;
    }

    const result = Array.isArray(response) ? response[0] : response;
    const status = String(result?.trans_status || result?.transStatus || '').toUpperCase();
    const transactionId = String(result?.tds_server_trans_id || result?.tdsServerTransID || result?.transaction_id || '');

    if (status === 'N' || status === 'R') {
        throw new CardTokenizationError('A autenticacao do cartao foi recusada pelo banco. Tente outro cartao ou utilize o Pix.');
    }

    if ((status === 'Y' || status === 'A' || status === 'C') && /^[a-zA-Z0-9_-]{8,128}$/.test(transactionId)) {
        return transactionId;
    }

    return null;
}
