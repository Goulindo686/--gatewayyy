require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { errorHandler } = require('./middlewares/error.middleware');
const { loginLimiter, registerLimiter, forgotPasswordLimiter } = require('./middlewares/rate-limit.middleware');

// Import routes
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const checkoutRoutes = require('./routes/checkout.routes');
const webhookRoutes = require('./routes/webhook.routes');
const withdrawalRoutes = require('./routes/withdrawal.routes');
const adminRoutes = require('./routes/admin.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const contentRoutes = require('./routes/content.routes');
const memberRoutes = require('./routes/member.routes');
const storeCategoriesRoutes = require('./routes/store_categories.routes');
const storeRoutes = require('./routes/store.routes');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: { error: 'Muitas requisições. Tente novamente mais tarde.' }
});
app.use('/api/', limiter);

// Webhook needs raw body for signature verification
app.use('/api/webhooks', express.raw({ type: 'application/json' }), (req, res, next) => {
    if (Buffer.isBuffer(req.body)) {
        req.body = JSON.parse(req.body.toString());
    }
    next();
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
}

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// API Routes
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api/auth/forgot-password', forgotPasswordLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/member', memberRoutes);
app.use('/api/store-categories', storeCategoriesRoutes);
app.use('/api/store', storeRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Rota não encontrada.' });
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`\n🚀 PayGateway API running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
