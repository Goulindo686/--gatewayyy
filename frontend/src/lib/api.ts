import axios, { type AxiosResponse } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
});

const internalApi = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' },
});

// The dashboard layout and page can mount at the same time and request the
// same resource with the same filters. Share only requests that are currently
// in flight; this is not a cache, so every later refresh still reaches the API.
const dashboardRequests = new Map<string, Promise<AxiosResponse<any>>>();

function dashboardRequestKey(path: string, params?: Record<string, unknown>) {
    const normalizedParams = Object.entries(params || {})
        .filter(([, value]) => value !== undefined && value !== null)
        .sort(([left], [right]) => left.localeCompare(right));

    return `${path}?${JSON.stringify(normalizedParams)}`;
}

function getDashboardResource(path: string, params?: Record<string, unknown>): Promise<AxiosResponse<any>> {
    if (typeof window === 'undefined') {
        return api.get(path, { params });
    }

    const authScope = localStorage.getItem('token') || 'anonymous';
    const key = `${authScope}:${dashboardRequestKey(path, params)}`;
    const existing = dashboardRequests.get(key);
    if (existing) return existing;

    const request = api.get(path, { params }).finally(() => {
        if (dashboardRequests.get(key) === request) {
            dashboardRequests.delete(key);
        }
    });

    dashboardRequests.set(key, request);
    return request;
}

api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

internalApi.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Auth
export const authAPI = {
    register: (data: any) => internalApi.post('/auth/register', data),
    login: (data: any) => internalApi.post('/auth/login', data),
    verifyEmail: (data: { verification_token: string; code: string }) => internalApi.post('/auth/email-verification/verify', data),
    resendEmailVerification: (verification_token: string) => internalApi.post('/auth/email-verification/resend', { verification_token }),
    getTwoFactorStatus: () => internalApi.get('/auth/2fa/status'),
    setupTwoFactor: (password: string) => internalApi.post('/auth/2fa/setup', { password }),
    confirmTwoFactor: (code: string) => internalApi.post('/auth/2fa/confirm', { code }),
    disableTwoFactor: (data: { password: string; code: string }) => internalApi.post('/auth/2fa/disable', data),
    regenerateTwoFactorRecoveryCodes: (code: string) => internalApi.post('/auth/2fa/recovery-codes', { code }),
    verifyTwoFactorLogin: (data: { two_factor_token: string; code: string }) => internalApi.post('/auth/2fa/verify', data),
    forgotPassword: (email: string) => internalApi.post('/auth/forgot-password', { email }),
    resetPassword: (data: any) => internalApi.post('/auth/reset-password', data),
    getProfile: () => internalApi.get('/auth/profile'),
    updateProfile: (data: any) => internalApi.put('/auth/profile', data),
    getKycLink: () => internalApi.post('/auth/recipient/kyc'),
};

// Products
export const productsAPI = {
    list: (params?: any) => api.get('/products', { params }),
    getById: (id: string) => api.get(`/products/${id}`),
    getPublic: (id: string) => api.get(`/products/public/${id}`),
    create: (data: any) => api.post('/products', data),
    update: (id: string, data: any) => api.put(`/products/${id}`, data),
    delete: (id: string) => api.delete(`/products/${id}`),
    updateCheckoutSettings: (id: string, settings: any) => api.put(`/products/${id}`, { checkout_settings: settings }),
    enroll: (id: string, email: string) => api.post(`/products/${id}/enroll`, { email }),
};

// Product management always uses the colocated Next.js API. This keeps the new
// management shell and protected delivery module independent from the legacy
// Express API URL that may still exist in development environments.
export const productManagementAPI = {
    create: (data: any) => internalApi.post('/products', data),
    getById: (id: string) => internalApi.get(`/products/${id}`),
    update: (id: string, data: any) => internalApi.put(`/products/${id}`, data),
    delete: (id: string) => internalApi.delete(`/products/${id}`),
    enroll: (id: string, email: string) => internalApi.post(`/products/${id}/enroll`, { email }),
};

export const uniqueDeliveryAPI = {
    getInventory: (productId: string) =>
        internalApi.get(`/products/${productId}/unique-deliveries`),
    createItems: (productId: string, items: any[]) =>
        internalApi.post(`/products/${productId}/unique-deliveries`, { items }),
    updateDeliveryMode: (productId: string, mode: 'members' | 'unique') =>
        internalApi.patch(`/products/${productId}/unique-deliveries`, { mode }),
    deleteItem: (productId: string, itemId: string) =>
        internalApi.delete(`/products/${productId}/unique-deliveries/${itemId}`),
};

export const myUniqueDeliveryAPI = {
    list: () => internalApi.get('/my-unique-deliveries'),
};

// Dashboard
export const dashboardAPI = {
    getStats: (params?: Record<string, unknown>) => getDashboardResource('/dashboard/stats', params),
    getConversion: (params?: Record<string, string | undefined>) => getDashboardResource('/dashboard/conversion', params),
    getSales: (params?: Record<string, unknown>) => getDashboardResource('/dashboard/sales', params),
};

// Affiliates
export const affiliatesAPI = {
    getOverview: () => internalApi.get('/affiliates/overview'),
    saveProgram: (productId: string, data: any) => internalApi.put(`/affiliates/programs/${productId}`, data),
    requestAffiliation: (data: { program_id?: string; invite_code?: string; terms_accepted: boolean }) =>
        internalApi.post('/affiliates/request', data),
    updateAffiliation: (id: string, data: { action: string; custom_commission_rate_bps?: number | null }) =>
        internalApi.patch(`/affiliates/affiliations/${id}`, data),
};

// Checkout
export const checkoutAPI = {
    pay: (data: any) => api.post('/checkout/pay', data),
    getOrderStatus: (id: string) => api.get(`/checkout/order/${id}`),
};

// Order Bumps (Internal Next.js API)
export const orderBumpsAPI = {
    list: (productId: string) => internalApi.get(`/order-bumps/${productId}/bumps`),
    create: (productId: string, data: any) => internalApi.post(`/order-bumps/${productId}/bumps`, data),
    update: (productId: string, bumpId: string, data: any) => internalApi.put(`/order-bumps/${productId}/bumps/${bumpId}`, data),
    delete: (productId: string, bumpId: string) => internalApi.delete(`/order-bumps/${productId}/bumps/${bumpId}`),
};

// Withdrawals
export const withdrawalsAPI = {
    request: (amount: number) => api.post('/withdrawals', { amount }),
    list: (params?: any) => api.get('/withdrawals', { params }),
    getBalance: () => api.get('/withdrawals/balance'),
};

// Admin
export const adminAPI = {
    getDashboard: () => api.get('/admin/dashboard'),
    listSellers: (params?: any) => api.get('/admin/sellers', { params }),
    listAdmins: (params?: any) => api.get('/admin/admins', { params }),
    toggleBlock: (id: string, blocked: boolean) => api.put(`/admin/sellers/${id}/block`, { blocked }),
    updateSellerPixFee: (id: string, data: { mode: 'default' | 'exempt' | 'fixed' | 'percentage'; value?: number }) =>
        api.put(`/admin/sellers/${id}/pix-fee`, data),
    impersonate: (id: string, reason: string) => api.post(`/admin/sellers/${id}/impersonate`, { reason }),
    listTransactions: (params?: any) => api.get('/admin/transactions', { params }),
    getSettings: () => api.get('/admin/settings'),
    updateFees: (fee_percentage: number) => api.put('/admin/settings/fees', { fee_percentage }),
    getAffiliates: () => internalApi.get('/admin/affiliates'),
};

// Content (Seller Side)
export const contentAPI = {
    listModules: (productId: string) => api.get(`/content/${productId}/modules`),
    createModule: (productId: string, data: any) => api.post(`/content/${productId}/modules`, data),
    updateModule: (moduleId: string, data: any) => api.put(`/content/modules/${moduleId}`, data),
    deleteModule: (moduleId: string) => api.delete(`/content/modules/${moduleId}`),

    listLessons: (moduleId: string) => api.get(`/content/modules/${moduleId}/lessons`),
    createLesson: (moduleId: string, data: any) => api.post(`/content/modules/${moduleId}/lessons`, data),
    updateLesson: (lessonId: string, data: any) => api.put(`/content/lessons/${lessonId}`, data),
    deleteLesson: (lessonId: string) => api.delete(`/content/lessons/${lessonId}`),

    listFiles: (lessonId: string) => api.get(`/content/lessons/${lessonId}/files`),
    addFile: (lessonId: string, data: any) => api.post(`/content/lessons/${lessonId}/files`, data),
    deleteFile: (fileId: string) => api.delete(`/content/files/${fileId}`),
};

// Member Area (Student Side)
export const memberAPI = {
    listMyProducts: () => api.get('/member/my-products'),
    getCourseContent: (productId: string) => api.get(`/member/course/${productId}`),
    getLesson: (lessonId: string) => api.get(`/member/lesson/${lessonId}`),
};

// Store Categories (Internal Next.js API)
export const storeCategoriesAPI = {
    list: () => internalApi.get('/store-categories'),
    create: (data: any) => internalApi.post('/store-categories', data),
    update: (id: string, data: any) => internalApi.put(`/store-categories/${id}`, data),
    delete: (id: string) => internalApi.delete(`/store-categories/${id}`),
};

// Store (Internal Next.js API)
export const storeAPI = {
    getStoreBySlug: (slug: string, category?: string) => internalApi.get(`/store/${slug}`, { params: { category } }),
    createOrder: (data: any) => internalApi.post('/store-checkout', data),
};

// Billings (Internal Next.js API - uses app/api/billing routes)
export const billingAPI = {
    getStats: () => internalApi.get('/billing/stats'),
    listCharges: (params?: any) => internalApi.get('/billing/charges', { params }),
    getCharge: (id: string) => internalApi.get(`/billing/charges/${id}`),
    createCharge: (data: { amount: number; description?: string; customer_name?: string; customer_doc?: string }) => internalApi.post('/billing/charges', data),
    cancelCharge: (id: string) => internalApi.patch(`/billing/charges/${id}/cancel`),
};

export default api;
