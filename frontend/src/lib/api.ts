import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
});

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

// Auth
export const authAPI = {
    register: (data: any) => api.post('/auth/register', data),
    login: (data: any) => api.post('/auth/login', data),
    forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
    resetPassword: (data: any) => api.post('/auth/reset-password', data),
    getProfile: () => api.get('/auth/profile'),
    updateProfile: (data: any) => internalApi.put('/auth/profile', data),
    getKycLink: () => api.post('/auth/recipient/kyc'),
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

// Dashboard
export const dashboardAPI = {
    getStats: () => api.get('/dashboard/stats'),
    getSales: (params?: any) => api.get('/dashboard/sales', { params }),
};

// Checkout
export const checkoutAPI = {
    pay: (data: any) => api.post('/checkout/pay', data),
    getOrderStatus: (id: string) => api.get(`/checkout/order/${id}`),
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
    toggleBlock: (id: string, blocked: boolean) => api.put(`/admin/sellers/${id}/block`, { blocked }),
    listTransactions: (params?: any) => api.get('/admin/transactions', { params }),
    getSettings: () => api.get('/admin/settings'),
    updateFees: (fee_percentage: number) => api.put('/admin/settings/fees', { fee_percentage }),
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
};

// Member Area (Student Side)
export const memberAPI = {
    listMyProducts: () => api.get('/member/my-products'),
    getCourseContent: (productId: string) => api.get(`/member/course/${productId}`),
    getLesson: (lessonId: string) => api.get(`/member/lesson/${lessonId}`),
};

// We create a separate instance for internal Next.js API calls 
// because main 'api' uses NEXT_PUBLIC_API_URL which points to the external backend.
const internalApi = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' },
});

internalApi.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

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

export default api;
