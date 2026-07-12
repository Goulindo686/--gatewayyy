import axios from 'axios';

const pagarmeApi = axios.create({
    baseURL: 'https://api.pagar.me/core/v5',
    auth: {
        username: process.env.PAGARME_API_KEY!,
        password: ''
    },
    headers: { 'Content-Type': 'application/json' }
});

export class PagarmeService {
    private static normalizeAddress(address: any) {
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

    private static buildCustomer(customer: any, requireAntifraudData: boolean) {
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

        const normalizedCustomer: any = {
            name: customer?.name || 'Cliente',
            email: customer?.email,
            document: document || '00000000000',
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

    static calculatePlatformFeeCents(input: { amountCents: number; paymentMethod: string; feePercentage: number }) {
        const amountCents = Math.max(0, Math.round(input.amountCents || 0));
        const feePercentage = Number.isFinite(input.feePercentage) ? Math.max(0, Math.min(100, input.feePercentage)) : 0;
        const paymentMethod = (input.paymentMethod || '').toLowerCase();

        if (feePercentage <= 0 || amountCents <= 0) return 0;

        if (paymentMethod === 'credit_card' || paymentMethod === 'card') {
            return Math.min(amountCents, Math.round(amountCents * (feePercentage / 100)));
        }

        const PLATFORM_FLAT_FEE = 200;
        return Math.min(PLATFORM_FLAT_FEE, amountCents);
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
        amount: number; payment_method: string; customer: any;
        card_data?: any; seller_recipient_id: string; platform_fee_percentage: number;
        ip?: string; session_id?: string; antifraud_disable?: boolean;
        items?: Array<{ amount: number; description: string; quantity: number; code: string }>;
    }) {
        const isCreditCard = data.payment_method === 'credit_card' || data.payment_method === 'card';

        const normalized = PagarmeService.buildCustomer(data.customer, isCreditCard);
        const orderData: any = {
            customer: normalized.customer,
            items: data.items?.length ? data.items : [{
                amount: data.amount,
                description: 'Pagamento de Pedido',
                quantity: 1,
                code: 'pay-001'
            }],
            payments: [],
            ip: data.ip,
            session_id: data.session_id,
            antifraud: data.antifraud_disable
                ? { enabled: false }
                : ((process.env.PAGARME_API_KEY || '').startsWith('sk_test') ? { enabled: false } : undefined)
        };

        const platId = (process.env.PLATFORM_RECIPIENT_ID || '').trim();
        const sellId = (data.seller_recipient_id || '').trim();
        const applyFee = (data.platform_fee_percentage || 0) > 0;
        const platformFeeAmount = applyFee
            ? PagarmeService.calculatePlatformFeeCents({
                amountCents: data.amount,
                paymentMethod: data.payment_method,
                feePercentage: data.platform_fee_percentage || 0
            })
            : 0;
        const sellerAmount = data.amount - platformFeeAmount;

        console.log('[PAGARME SERVICE] Split Config:', {
            platId, sellId, platformFeeAmount, sellerAmount, applyFee
        });

        const hasSellerRecipient = !!sellId;
        const includePlatformFee = !!(applyFee && platId && platId.toLowerCase() !== sellId.toLowerCase() && platformFeeAmount > 0);

        // Se não há split (admin sem taxa), não envia splitRules para o Pagar.me
        const splitRules = hasSellerRecipient && includePlatformFee ? [
            {
                amount: sellerAmount,
                recipient_id: sellId,
                type: 'flat',
                options: { charge_processing_fee: true, liable: true, charge_remainder_fee: true }
            },
            {
                amount: platformFeeAmount,
                recipient_id: platId,
                type: 'flat',
                options: { charge_processing_fee: false, liable: false, charge_remainder_fee: false }
            }
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
            const card = data.card_data || {};
            const cleanNumber = String(card.number || '').replace(/\D/g, '');
            const expMonth = parseInt(String(card.exp_month || '0')) || 1;
            const rawYear = String(card.exp_year || '0');
            const expYear = parseInt(rawYear.length === 2 ? `20${rawYear}` : rawYear) || 2030;
            const installments = parseInt(String(card.installments || '1')) || 1;
            const finalInstallments = Math.max(1, Math.min(12, installments));

            orderData.payments.push({
                payment_method: 'credit_card',
                split: splitRules,
                credit_card: {
                    operation_type: 'auth_and_capture',
                    installments: finalInstallments,
                    statement_descriptor: PagarmeService.getStatementDescriptor(),
                    card: {
                        number: cleanNumber,
                        holder_name: card.holder_name || data.customer.name,
                        exp_month: expMonth,
                        exp_year: expYear,
                        cvv: card.cvv,
                        billing_address: normalized.address
                    },
                    billing: {
                        name: data.customer.name || 'Cliente',
                        address: normalized.address
                    }
                }
            });
        }

        const response = await pagarmeApi.post('/orders', orderData);
        return response.data;
    }

    /**
     * Create an order with multiple items (Cart)
     */
    static async createMultiItemOrder(data: {
        items: any[]; payment_method: string; customer: any;
        card_data?: any; seller_recipient_id: string; platform_fee_percentage: number;
        ip?: string; session_id?: string; antifraud_disable?: boolean;
    }) {
        const isCreditCard = data.payment_method === 'credit_card' || data.payment_method === 'card';

        const normalized = PagarmeService.buildCustomer(data.customer, isCreditCard);
        const orderData: any = {
            customer: normalized.customer,
            items: data.items.map(item => ({
                amount: Math.round(item.price * 100),
                description: item.name,
                quantity: item.quantity,
                code: item.id
            })),
            payments: [],
            ip: data.ip,
            session_id: data.session_id,
            antifraud: data.antifraud_disable
                ? { enabled: false }
                : ((process.env.PAGARME_API_KEY || '').startsWith('sk_test') ? { enabled: false } : undefined)
        };

        const platId = (process.env.PLATFORM_RECIPIENT_ID || '').trim();
        const sellId = (data.seller_recipient_id || '').trim();

        const totalAmountCents = data.items.reduce((sum: number, item: any) => sum + Math.round(item.price * 100) * item.quantity, 0);

        const applyFee2 = (data.platform_fee_percentage || 0) > 0;
        const platformFeeAmount = applyFee2
            ? PagarmeService.calculatePlatformFeeCents({
                amountCents: totalAmountCents,
                paymentMethod: data.payment_method,
                feePercentage: data.platform_fee_percentage || 0
            })
            : 0;
        const sellerAmount = totalAmountCents - platformFeeAmount;

        console.log('[PAGARME SERVICE] MultiItem Split Config:', {
            platId, sellId, platformFeeAmount, sellerAmount, applyFee2
        });

        const hasSellerRecipient2 = !!sellId;
        const includePlatformFee2 = !!(applyFee2 && platId && platId.toLowerCase() !== sellId.toLowerCase() && platformFeeAmount > 0);

        const splitRules = hasSellerRecipient2 && includePlatformFee2 ? [
            {
                amount: sellerAmount,
                recipient_id: sellId,
                type: 'flat',
                options: { charge_processing_fee: true, liable: true, charge_remainder_fee: true }
            },
            {
                amount: platformFeeAmount,
                recipient_id: platId,
                type: 'flat',
                options: { charge_processing_fee: false, liable: false, charge_remainder_fee: false }
            }
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
            const card = data.card_data || {};
            const cleanNumber = String(card.number || '').replace(/\D/g, '');
            const expMonth = parseInt(String(card.exp_month || '0')) || 1;
            const rawYear = String(card.exp_year || '0');
            const expYear = parseInt(rawYear.length === 2 ? `20${rawYear}` : rawYear) || 2030;
            const installments = parseInt(String(card.installments || '1')) || 1;
            const finalInstallments = Math.max(1, Math.min(12, installments));

            orderData.payments.push({
                payment_method: 'credit_card',
                split: splitRules,
                credit_card: {
                    operation_type: 'auth_and_capture',
                    installments: finalInstallments,
                    statement_descriptor: PagarmeService.getStatementDescriptor(),
                    card: {
                        number: cleanNumber,
                        holder_name: card.holder_name || data.customer.name,
                        exp_month: expMonth,
                        exp_year: expYear,
                        cvv: card.cvv,
                        billing_address: normalized.address
                    },
                    billing: {
                        name: data.customer.name || 'Cliente',
                        address: normalized.address
                    }
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

        // Taxa fixa de 2% para assinaturas (Pagar.me cobra 3,19% do cartão separadamente)
        const SUBSCRIPTION_PLATFORM_PCT = 2;
        const platformPct = applyFee ? SUBSCRIPTION_PLATFORM_PCT : 0;
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
