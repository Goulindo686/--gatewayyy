const express = require('express');
const { body } = require('express-validator');
const checkoutController = require('../controllers/checkout.controller');
const { validate } = require('../middlewares/validation.middleware');
const { auth } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/pay', [
    body('product_id').notEmpty().withMessage('Produto é obrigatório'),
    body('payment_method').isIn(['pix', 'credit_card']).withMessage('Método de pagamento inválido'),
    body('buyer.name').notEmpty().withMessage('Nome do comprador é obrigatório'),
    body('buyer.email').isEmail().withMessage('Email do comprador é inválido'),
    body('buyer.cpf').notEmpty().withMessage('CPF do comprador é obrigatório'),
    validate
], checkoutController.processPayment);

router.post('/store-checkout', [
    body('items_cart').isArray().withMessage('Itens do carrinho inválidos'),
    body('payment_method').isIn(['pix', 'credit_card']).withMessage('Método de pagamento inválido'),
    body('buyer.email').isEmail().withMessage('Email do comprador é inválido'),
    validate
], checkoutController.processStoreCheckout);

router.get('/order/:id', (req, res, next) => {
    // We try to authenticate but don't block if it fails (for public order tracking)
    // The controller will handle specific field masking/permissions
    if (req.headers.authorization) {
        auth(req, res, () => {
            checkoutController.getOrderStatus(req, res, next);
        });
    } else {
        checkoutController.getOrderStatus(req, res, next);
    }
});

module.exports = router;
