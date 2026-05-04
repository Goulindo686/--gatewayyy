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
    }) {
        const sellerPercentage = 100 - (data.platform_fee_percentage || 0);

        // Robust Address Object with fallback to dummy only if absolutely missing or incomplete
        const isAddressComplete = (addr: any) => {
            return addr && 
                   addr.zip_code && addr.zip_code.length >= 8 &&
                   addr.city && addr.city.trim() !== '' &&
                   addr.state && addr.state.trim() !== '';
        };

        const address = isAddressComplete(data.customer.address) ? data.customer.address : {
            line_1: 'Rua Teste, 123, Centro',
            zip_code: '01001000',
            city: 'São Paulo',
            state: 'SP',
            country: 'BR',
            street: 'Rua Teste',
            number: '123',
            neighborhood: 'Centro'
        };

        const orderData: any = {
            customer: {
                name: data.customer.name || 'Cliente',
                email: data.customer.email,
                document: data.customer.cpf?.replace(/\D/g, '') || '00000000000',
                type: 'individual',
                phones: {
                    mobile_phone: {
                        country_code: '55',
                        area_code: data.customer.phone?.replace(/\D/g, '').substring(0, 2) || '11',
                        number: data.customer.phone?.replace(/\D/g, '').substring(2) || '999999999'
                    }
                },
                address
            },
            items: [{
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
        const PLATFORM_FLAT_FEE = 200; // R$2,00 em centavos

        // Se feePercentage === 0 (admin), não cobra taxa da plataforma
        const applyFee = (data.platform_fee_percentage || 0) > 0;
        const platformFeeAmount = applyFee ? Math.min(PLATFORM_FLAT_FEE, data.amount) : 0;
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
                    additional_information: [{ name: 'Plataforma', value: process.env.PLATFORM_NAME || 'PayGateway' }]
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
                    statement_descriptor: 'PEDIDO',
                    card: {
                        number: cleanNumber,
                        holder_name: card.holder_name || data.customer.name,
                        exp_month: expMonth,
                        exp_year: expYear,
                        cvv: card.cvv,
                        billing_address: address
                    },
                    billing: {
                        name: data.customer.name || 'Cliente',
                        address: address
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
        const sellerPercentage = 100 - (data.platform_fee_percentage || 0);

        // Robust Address Object with fallback to dummy only if absolutely missing or incomplete
        const isAddressComplete = (addr: any) => {
            return addr && 
                   addr.zip_code && addr.zip_code.length >= 8 &&
                   addr.city && addr.city.trim() !== '' &&
                   addr.state && addr.state.trim() !== '';
        };

        const address = isAddressComplete(data.customer.address) ? data.customer.address : {
            line_1: 'Rua Teste, 123, Centro',
            zip_code: '01001000',
            city: 'São Paulo',
            state: 'SP',
            country: 'BR',
            street: 'Rua Teste',
            number: '123',
            neighborhood: 'Centro'
        };

        const orderData: any = {
            customer: {
                name: data.customer.name || 'Cliente',
                email: data.customer.email,
                document: data.customer.cpf?.replace(/\D/g, '') || '00000000000',
                type: 'individual',
                phones: {
                    mobile_phone: {
                        country_code: '55',
                        area_code: data.customer.phone?.replace(/\D/g, '').substring(0, 2) || '11',
                        number: data.customer.phone?.replace(/\D/g, '').substring(2) || '999999999'
                    }
                },
                address
            },
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
        const PLATFORM_FLAT_FEE = 200; // R$2,00 em centavos

        const totalAmountCents = data.items.reduce((sum: number, item: any) => sum + Math.round(item.price * 100) * item.quantity, 0);

        // Se feePercentage === 0 (admin), não cobra taxa da plataforma
        const applyFee2 = (data.platform_fee_percentage || 0) > 0;
        const platformFeeAmount = applyFee2 ? Math.min(PLATFORM_FLAT_FEE, totalAmountCents) : 0;
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
                pix: { expires_in: 3600 }
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
                    statement_descriptor: 'LOJA',
                    card: {
                        number: cleanNumber,
                        holder_name: card.holder_name || data.customer.name,
                        exp_month: expMonth,
                        exp_year: expYear,
                        cvv: card.cvv,
                        billing_address: address
                    },
                    billing: {
                        name: data.customer.name || 'Cliente',
                        address: address
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
