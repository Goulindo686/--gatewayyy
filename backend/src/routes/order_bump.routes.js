const express = require('express');
const { body } = require('express-validator');
const orderBumpController = require('../controllers/order_bump.controller');
const { auth, sellerOnly } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');
const { publicReadLimiter } = require('../middlewares/rate-limit.middleware');

const router = express.Router({ mergeParams: true });

// Rota pública — checkout busca os bumps ativos de um produto
router.get('/public/:product_id/bumps', publicReadLimiter, orderBumpController.listPublic);

// Rotas protegidas (seller)
router.use(auth, sellerOnly);

// CRUD de order bumps de um produto
// Montado em /api/order-bumps — rotas ficam:
//   GET    /api/order-bumps/:product_id/bumps
//   POST   /api/order-bumps/:product_id/bumps
//   PUT    /api/order-bumps/:product_id/bumps/:bump_id
//   DELETE /api/order-bumps/:product_id/bumps/:bump_id
router.get('/:product_id/bumps', orderBumpController.list);

router.post('/:product_id/bumps', [
    body('bump_product_id').notEmpty().withMessage('Produto do bump é obrigatório'),
    body('title').optional().notEmpty().withMessage('Título não pode ser vazio'),
    body('custom_price').optional().isFloat({ min: 0.01 }).withMessage('Preço customizado deve ser maior que zero'),
    validate
], orderBumpController.create);

router.put('/:product_id/bumps/:bump_id', [
    body('title').optional().notEmpty().withMessage('Título não pode ser vazio'),
    body('custom_price').optional().isFloat({ min: 0.01 }).withMessage('Preço customizado deve ser maior que zero'),
    validate
], orderBumpController.update);

router.delete('/:product_id/bumps/:bump_id', orderBumpController.delete);

module.exports = router;
