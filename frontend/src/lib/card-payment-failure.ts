type CardFailureCategory =
    | 'antifraud_declined'
    | 'issuer_declined'
    | 'card_verification_failed'
    | 'capture_failed'
    | 'processing_error'
    | 'not_authorized';

export type CardPaymentFailureClassification = {
    category: CardFailureCategory;
    message: string;
    diagnostics: Record<string, unknown>;
};

const CARD_FAILURE_MESSAGES: Record<CardFailureCategory, string> = {
    antifraud_declined: 'A compra nao foi aprovada pela analise de seguranca. Tente outro cartao ou utilize o Pix.',
    issuer_declined: 'O banco emissor nao autorizou a compra. Confira os dados ou tente outro cartao.',
    card_verification_failed: 'Nao foi possivel validar este cartao. Confira os dados ou tente outro cartao.',
    capture_failed: 'A transacao foi autorizada, mas nao foi concluida. Aguarde alguns minutos e tente novamente.',
    processing_error: 'Nao foi possivel concluir a analise do pagamento agora. Tente novamente em alguns minutos ou utilize o Pix.',
    not_authorized: 'A transacao nao foi autorizada. Confira os dados ou tente outro cartao.',
};

function text(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
}

function record(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function lower(value: unknown) {
    return text(value).toLowerCase();
}

function hasGatewayErrors(errors: unknown) {
    return Array.isArray(errors) ? errors.length > 0 : !!errors;
}

function acquirerMessageLooksApproved(message: string) {
    return /aprovad|approved|authorized|autorizad/i.test(message);
}

function antifraudDeclined(status: string, reason: string) {
    const declinedStatus = /^(reprov|recus|denied|declined|rejected|blocked|refused|unauthori)/i.test(status);
    const declinedReason = /(high[\s_-]*risk|alto[\s_-]*risco|suspect(?:ed)?[\s_-]*fraud|fraudulent|suspeita.*fraude|bloquead|blocked|denied|declined|rejected|refused)/i.test(reason);
    return declinedStatus || declinedReason;
}

function antifraudTechnicalFailure(status: string, reason: string) {
    return /^(failed|error|timeout|unavailable)$/i.test(status)
        || /(timeout|temporar|indispon|unavailable|internal|erro|error|falha tecnica)/i.test(reason);
}

function providerMessageFrom(error: unknown) {
    const errorRecord = record(error);
    const response = record(errorRecord.response);
    const body = record(response.data);
    return text(body.message || body.error || errorRecord.message);
}

export function classifyCardProviderRequestError(error: unknown): CardPaymentFailureClassification {
    const errorRecord = record(error);
    const response = record(errorRecord.response);
    const providerStatus = response.status;
    const providerMessage = providerMessageFrom(error);
    const providerMessageLower = providerMessage.toLowerCase();

    let category: CardFailureCategory = 'processing_error';
    if (providerStatus === 412 || /verification failed|verificacao do cartao|validar este cartao|card verification/i.test(providerMessage)) {
        category = 'card_verification_failed';
    } else if (/token/i.test(providerMessageLower)) {
        category = 'processing_error';
    }

    return {
        category,
        message: /token/i.test(providerMessageLower)
            ? 'O token seguro do cartao expirou. Confira os dados e tente novamente.'
            : CARD_FAILURE_MESSAGES[category],
        diagnostics: {
            provider_status: providerStatus,
            provider_message: providerMessage.slice(0, 300),
        },
    };
}

export function isPagarmePaymentFailed(order: unknown) {
    const orderRecord = record(order);
    const charges = Array.isArray(orderRecord.charges) ? orderRecord.charges : [];
    const charge = record(charges[0]);
    const transaction = record(charge.last_transaction);

    return charge.status === 'failed'
        || orderRecord.status === 'failed'
        || transaction.status === 'failed'
        || transaction.status === 'not_authorized';
}

export function classifyCardPaymentFailure(order: unknown): CardPaymentFailureClassification {
    const orderRecord = record(order);
    const charges = Array.isArray(orderRecord.charges) ? orderRecord.charges : [];
    const charge = record(charges[0]);
    const transaction = record(charge.last_transaction);
    const gatewayResponse = record(transaction.gateway_response);
    const gatewayErrors = gatewayResponse.errors;
    const antifraud = record(transaction.antifraud_response);
    const antifraudStatus = lower(antifraud.status);
    const antifraudReason = lower(antifraud.reason);
    const transactionStatus = lower(transaction.status);
    const acquirerMessage = text(transaction.acquirer_message);
    const acquirerCode = text(transaction.acquirer_return_code);

    let category: CardFailureCategory = 'not_authorized';

    if (antifraudDeclined(antifraudStatus, antifraudReason)) {
        category = 'antifraud_declined';
    } else if (antifraudTechnicalFailure(antifraudStatus, antifraudReason)) {
        category = 'processing_error';
    } else if (transactionStatus === 'not_authorized' || hasGatewayErrors(gatewayErrors) || acquirerCode) {
        category = 'issuer_declined';
    } else if (acquirerMessage) {
        category = acquirerMessageLooksApproved(acquirerMessage) ? 'capture_failed' : 'issuer_declined';
    }

    return {
        category,
        message: CARD_FAILURE_MESSAGES[category],
        diagnostics: {
            pagarme_order_id: orderRecord.id,
            charge_id: charge.id,
            order_status: orderRecord.status,
            charge_status: charge.status,
            transaction_status: transaction.status,
            antifraud_status: antifraud.status,
            antifraud_reason: antifraud.reason,
            acquirer_code: transaction.acquirer_return_code,
            acquirer_message: acquirerMessage.slice(0, 160),
            has_gateway_errors: hasGatewayErrors(gatewayErrors),
            category,
        },
    };
}
