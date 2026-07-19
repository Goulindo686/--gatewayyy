import axios from 'axios';

export const CARD_PLATFORM_FEE_PERCENTAGE = 2;
export const PIX_PLATFORM_FLAT_FEE_CENTS = 200;

const pagarmeApi = axios.create({
    baseURL: 'https://api.pagar.me/core/v5',
    auth: {
        username: process.env.PAGARME_API_KEY!,
        password: ''
    },
    headers: { 'Content-Type': 'application/json' }
});

type CheckoutAddress = {
    zip_code?: string;
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    country?: string;
};

type CheckoutCustomer = {
    name?: string;
    email?: string;
    cpf?: string;
    phone?: string;
    address?: CheckoutAddress;
};

type CheckoutItem = {
    amount: number;
    description: string;
    quantity: number;
    code: string;
};

export class PagarmeService {
    private static normalizeAddress(address?: CheckoutAddress) {
        const zipCode = String(address?.zip_code || '').replace(/\D/g, '');
        const street = String(address?.street || '').trim();
        const number = String(address?.number || '').trim();
        const neighborhood = String(address?.neighborhood || '').trim();
        const city = String(address?.city || '').trim();
        const state = String(address?.state || '').trim().toUpperCase();

        return {
            line_1: [number, street, neighborhood].filter(Boolean).join(', '),
            zip_code: zipCode,
            city,
            state,
            country: 'BR'
        };
    }

    private static buildCustomer(customer: CheckoutCustomer, requireAntifraudData: boolean) {
        const document = String(customer?.cpf || '').replace(/\D/g, '');
        const phone = String(customer?.phone || '').replace(/\D/g, '');
        const address = PagarmeService.normalizeAddress(customer?.address);
        const hasValidAddress = address.zip_code.length === 8
            && !!address.city
            && address.state.length === 2
            && !!address.line_1;

        if (requireAntifraudData) {
            if (document.length !== 11) throw new Error('CPF invalido para pagamento com cartao.');
            if (phone.length < 10 || phone.length > 11) throw new Error('Telefone invalido para pagamento com cartao.');
            if (!hasValidAddress) throw new Error('Endereco de cobranca incompleto para pagamento com cartao.');
        }

        const normalizedCustomer: Record<string, unknown> = {
            name: customer?.name || 'Cliente',
            email: customer?.email,
            document: document || '00000000000',
            document_type: 'CPF',
            type: 'individual',
            phones: {
                mobile_phone: {
                    country_code: '55',
                    area_code: phone.substring(0, 2) || '11',
                    number: phone.substring(2) || '999999999'
                }
            }
        };

        if (hasValidAddress) normalizedCustomer.address = address;
        return { customer: normalizedCustomer, address };
    }

    private static async createCustomerAndCard(customer: CheckoutCustomer, cardToken: string) {
        if (!/^token_[a-zA-Z0-9]+$/.test(cardToken || '')) {
            throw new Error('Token do cartao invalido ou expirado. Tente novamente.');
        }

        const normalized = PagarmeService.buildCustomer(customer, true);
        const customerResponse = await pagarmeApi.post('/customers', normalized.customer);
        const customerId = String(customerResponse.data?.id || '');
        if (!customerId.startsWith('cus_')) {
            throw new Error('O Pagar.me nao retornou um cliente valido para o pedido.');
        }

        const cardResponse = await pagarmeApi.post(`/customers/${customerId}/cards`, {
            token: cardToken,
            billing_address: normalized.address,
        });
        const cardId = String(cardResponse.data?.id || '');
        if (!cardId.startsWith('card_')) {
            throw new Error('O Pagar.me nao retornou um cartao valido para o pedido.');
        }

        return {
            customerId,
            cardId,
            cardBrand: String(cardResponse.data?.brand || '').toLowerCase(),
            normalized,
        };
    }

    static calculatePlatformFeeCents(input: { amountCents: number; paymentMethod: string; feePercentage: number }) {
        const amountCents = Math.max(0, Math.round(input.amountCents || 0));
        const feePercentage = Number.isFinite(input.feePercentage) ? Math.max(0, Math.min(100, input.feePercentage)) : 0;
        const paymentMethod = (input.paymentMethod || '').toLowerCase();

        if (feePercentage <= 0 || amountCents <= 0) return 0;

        if (paymentMethod === 'credit_card' || paymentMethod === 'card') {
            return Math.min(amountCents, Math.round(amountCents * (feePercentage / 100)));
        }

        return Math.min(PIX_PLATFORM_FLAT_FEE_CENTS, amountCents);
    }

    static getStatementDescriptor() {
        const raw = (process.env.PAGARME_STATEMENT_DESCRIPTOR || process.env.PLATFORM_NAME || 'GOUPAYPAGTO').toString();
        const cleaned = raw
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]/g, '')
            .toUpperCase()
            .slice(0, 13);
        return cleaned.length >= 3 ? cleaned : 'GOUPAYPAGTO';
    }

    static async createRecipient(data: {
        name: string; email: string; cpf_cnpj: string; type: string;
        bank_code?: string; agency?: string; agency_digit?: string; account?: string; account_digit?: string; account_type?: string;
    }) {
        const response = await pagarmeApi.post('/recipients', {
            name: data.name,
            email: data.email,
            document: data.cpf_cnpj,
            type: data.type || 'individual',
            default_bank_account: {
                holder_name: data.name.substring(0, 30),
                holder_type: data.type || 'individual',
                holder_document: data.cpf_cnpj,
                bank: data.bank_code || '001',
                branch_number: data.agency || '0001',
                branch_check_digit: data.agency_digit || '0',
                account_number: data.account || '0000000',
                account_check_digit: data.account_digit || '0',
                type: data.account_type || 'checking'
            },
            transfer_settings: {
                transfer_enabled: true,
                transfer_interval: 'daily',
                transfer_day: 0
            },
            automatic_anticipation_settings: {
                enabled: false
            }
        });
        return response.data;
    }

    static async createOrder(data: {
        amount: number; payment_method: string; customer: CheckoutCustomer;
        card_token?: string; installments?: number;
        seller_recipient_id: string; platform_fee_percentage: number;
        platform_fee_amount?: number;
        ip?: string; session_id?: string; device_platform?: string; order_code?: string; three_ds_transaction_id?: string;
        items?: CheckoutItem[];
    }) {
        const isCreditCard = data.payment_method === 'credit_card' || data.payment_method === 'card';

        const normalized = PagarmeService.buildCustomer(data.customer, isCreditCard);
        const orderData: Record<string, unknown> & { payments: Array<Record<string, unknown>> } = {
            items: data.items?.length ? data.items : [{
                amount: data.amount,
                description: 'Pagamento de Pedido',
                quantity: 1,
                code: 'pay-001'
            }],
            payments: [],
            closed: true,
            code: data.order_code?.slice(0, 52),
            ip: data.ip,
            session_id: data.session_id,
            device: data.device_platform ? { platform: data.device_platform.slice(0, 64) } : undefined,
            metadata: {
                checkout_origin: 'goupay_transparent',
                delivery_type: 'digital',
                three_ds_authenticated: data.three_ds_transaction_id ? 'true' : 'false',
            },
        };

        let cardId: string | undefined;
        if (isCreditCard) {
            const prepared = await PagarmeService.createCustomerAndCard(data.customer, data.card_token || '');
            orderData.customer_id = prepared.customerId;
            cardId = prepared.cardId;

            const requiresStone3DS = process.env.REQUIRE_CREDIT_CARD_3DS === 'true'
                && (prepared.cardBrand === 'visa' || prepared.cardBrand === 'mastercard');
            if (requiresStone3DS && !data.three_ds_transaction_id) {
                throw new Error('Autenticacao 3DS obrigatoria para este cartao. Recarregue o checkout e tente novamente.');
            }

            console.log('[PAGARME SERVICE] Card security:', {
                brand: prepared.cardBrand || 'unknown',
                three_ds_required: requiresStone3DS,
                three_ds_authenticated: !!data.three_ds_transaction_id,
                has_ip: !!data.ip,
                has_session_id: !!data.session_id,
                has_device: !!data.device_platform,
            });
        } else {
            orderData.customer = normalized.customer;
        }

        const platId = (process.env.PLATFORM_RECIPIENT_ID || '').trim();
        const sellId = (data.seller_recipient_id || '').trim();
        const requestedFeePercentage = data.platform_fee_percentage || 0;
        const applyFee = requestedFeePercentage > 0;
        const hasExplicitPixFee = !isCreditCard && data.platform_fee_amount !== undefined;
        const effectiveFeePercentage = isCreditCard && applyFee
            ? CARD_PLATFORM_FEE_PERCENTAGE
            : requestedFeePercentage;

        if (isCreditCard && applyFee && (!platId || !sellId || platId.toLowerCase() === sellId.toLowerCase())) {
            throw new Error('Configuracao de split do cartao incompleta. Verifique os recipients da plataforma e do vendedor.');
        }

        const platformFeeAmount = hasExplicitPixFee
            ? Math.min(data.amount, Math.max(0, Math.round(Number(data.platform_fee_amount) || 0)))
            : applyFee
                ? PagarmeService.calculatePlatformFeeCents({
                amountCents: data.amount,
                paymentMethod: data.payment_method,
                feePercentage: effectiveFeePercentage
                })
                : 0;
        if (platformFeeAmount > 0 && (!platId || !sellId || platId.toLowerCase() === sellId.toLowerCase())) {
            throw new Error('Configuracao de split incompleta. Verifique os recipients da plataforma e do vendedor.');
        }
        const sellerAmount = data.amount - platformFeeAmount;

        console.log('[PAGARME SERVICE] Split Config:', {
            platId, sellId, platformFeeAmount, sellerAmount, applyFee,
            effectiveFeePercentage: isCreditCard ? effectiveFeePercentage : undefined,
        });

        const hasSellerRecipient = !!sellId;
        const includePlatformFee = !!(platId && platId.toLowerCase() !== sellId.toLowerCase() && platformFeeAmount > 0);

        // Uma isenção individual ainda envia o vendedor como recebedor. Assim,
        // charge_processing_fee continua true e a tarifa do Pagar.me permanece
        // sob responsabilidade dele, mesmo quando a taxa da plataforma é zero.
        const splitRules = hasSellerRecipient && (includePlatformFee || hasExplicitPixFee) ? [
            {
                amount: sellerAmount,
                recipient_id: sellId,
                type: 'flat',
                options: { charge_processing_fee: true, liable: true, charge_remainder_fee: true }
            },
            ...(includePlatformFee ? [{
                amount: platformFeeAmount,
                recipient_id: platId,
                type: 'flat',
                options: { charge_processing_fee: false, liable: false, charge_remainder_fee: false }
            }] : [])
        ] : undefined;

        if (data.payment_method === 'pix') {
            orderData.payments.push({
                payment_method: 'pix',
                split: splitRules,
                pix: {
                    expires_in: 3600,
                    additional_information: [{ name: 'Plataforma', value: process.env.PLATFORM_NAME || 'GOUPAY PAGAMENTOS' }]
                }
            });
        } else if (data.payment_method === 'credit_card' || data.payment_method === 'card') {
            const installments = Math.trunc(Number(data.installments || 1));
            const finalInstallments = Math.max(1, Math.min(12, installments));

            orderData.payments.push({
                payment_method: 'credit_card',
                split: splitRules,
                credit_card: {
                    operation_type: 'auth_and_capture',
                    installments: finalInstallments,
                    statement_descriptor: PagarmeService.getStatementDescriptor(),
                    card_id: cardId,
                    ...(data.three_ds_transaction_id ? {
                        authentication: {
                            type: 'threed_secure',
                            threed_secure: {
                                mpi: 'pagarme',
                                transaction_id: data.three_ds_transaction_id,
                            }
                        }
                    } : {}),
                }
            });
        }

        const response = await pagarmeApi.post('/orders', orderData);
        return response.data;
    }

    static async getRecipientBalance(recipientId: string) {
        const response = await pagarmeApi.get(`/recipients/${recipientId}/balance`);
        return response.data;
    }

    static async getRecipientTransfers(recipientId: string) {
        const response = await pagarmeApi.get(`/recipients/${recipientId}/transfers?page=1&size=50`);
        return response.data;
    }

    static async createTransfer(recipientId: string, amount: number) {
        const response = await pagarmeApi.post(`/recipients/${recipientId}/transfers`, { amount });
        return response.data;
    }

    static async getRecipient(recipientId: string) {
        const response = await pagarmeApi.get(`/recipients/${recipientId}`);
        return response.data;
    }

    static async updateRecipient(recipientId: string, data: {
        name: string; email: string; cpf_cnpj: string; type: string;
        bank_code: string; agency: string; agency_digit?: string; account: string; account_digit: string; account_type: string;
    }) {
        const response = await pagarmeApi.put(`/recipients/${recipientId}`, {
            name: data.name,
            email: data.email,
            type: data.type || 'individual',
            default_bank_account: {
                holder_name: data.name.substring(0, 30),
                holder_type: data.type || 'individual',
                holder_document: data.cpf_cnpj,
                bank: data.bank_code,
                branch_number: data.agency,
                branch_check_digit: data.agency_digit || '0',
                account_number: data.account,
                account_check_digit: data.account_digit || '0',
                type: data.account_type || 'checking'
            }
        });
        return response.data;
    }

    static async getOrder(orderId: string) {
        const response = await pagarmeApi.get(`/orders/${orderId}`);
        return response.data;
    }

    static async createKycLink(recipientId: string) {
        const response = await pagarmeApi.post(`/recipients/${recipientId}/kyc_link`);
        return response.data;
    }

    // ─── Subscription Methods ───────────────────────────────────────────────

    static async createPlan(data: {
        name: string;
        amount: number;
        interval: 'month' | 'week' | 'year';
        interval_count: number;
    }) {
        const response = await pagarmeApi.post('/plans', {
            name: data.name,
            interval: data.interval,
            interval_count: data.interval_count,
            billing_type: 'prepaid',
            currency: 'BRL',
            payment_methods: ['credit_card'],
            items: [{
                name: data.name,
                quantity: 1,
                pricing_scheme: {
                    scheme_type: 'unit',
                    price: data.amount
                }
            }]
        });
        return response.data;
    }

    static async createSubscription(data: {
        plan_id: string;
        customer: { name: string; email: string; cpf: string; phone?: string };
        card: { number: string; holder_name: string; exp_month: number; exp_year: number; cvv: string };
        address?: { zip_code: string; street: string; number: string; city: string; state: string };
        seller_recipient_id: string;
        platform_fee_percentage: number;
        amount: number;
    }) {
        const cpf = data.customer.cpf.replace(/\D/g, '');
        const phone = (data.customer.phone || '').replace(/\D/g, '');

        const applyFee = data.platform_fee_percentage > 0;
        const platId = (process.env.PLATFORM_RECIPIENT_ID || '').trim();
        const sellId = data.seller_recipient_id.trim();

        // A mesma taxa de 2% do cartão também vale para assinaturas.
        const platformPct = applyFee ? CARD_PLATFORM_FEE_PERCENTAGE : 0;
        const sellerPct = 100 - platformPct;

        // Split como objeto com rules (formato correto para assinaturas no Pagar.me v5)
        const splitRules = applyFee && platId && platId !== sellId && platformPct > 0 ? {
            rules: [
                { amount: sellerPct, recipient_id: sellId, type: 'percentage', options: { charge_processing_fee: true, liable: true, charge_remainder_fee: true } },
                { amount: platformPct, recipient_id: platId, type: 'percentage', options: { charge_processing_fee: false, liable: false, charge_remainder_fee: false } }
            ]
        } : undefined;

        const billingAddress = data.address ? {
            line_1: `${data.address.street}, ${data.address.number}`,
            zip_code: data.address.zip_code.replace(/\D/g, ''),
            city: data.address.city,
            state: data.address.state,
            country: 'BR'
        } : {
            line_1: 'Rua Sem Endereco, 1, Centro',
            zip_code: '01001000',
            city: 'Sao Paulo',
            state: 'SP',
            country: 'BR'
        };
        const response = await pagarmeApi.post('/subscriptions', {
            plan_id: data.plan_id,
            payment_method: 'credit_card',
            split: splitRules,
            customer: {
                name: data.customer.name,
                email: data.customer.email,
                document: cpf,
                type: 'individual',
                phones: {
                    mobile_phone: {
                        country_code: '55',
                        area_code: phone.substring(0, 2) || '11',
                        number: phone.substring(2) || '999999999'
                    }
                }
            },
            card: {
                number: data.card.number.replace(/\D/g, ''),
                holder_name: data.card.holder_name,
                exp_month: data.card.exp_month,
                exp_year: data.card.exp_year,
                cvv: data.card.cvv,
                billing_address: billingAddress
            }
        });
        return response.data;
    }

    static async cancelSubscription(subscriptionId: string) {
        const response = await pagarmeApi.delete(`/subscriptions/${subscriptionId}`);
        return response.data;
    }

    static async getSubscription(subscriptionId: string) {
        const response = await pagarmeApi.get(`/subscriptions/${subscriptionId}`);
        return response.data;
    }
}

export default pagarmeApi;
