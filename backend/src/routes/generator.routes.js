const express = require('express');
const router = express.Router();
const generatorController = require('../controllers/generator.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

// Rotas protegidas (requerem autenticação)
router.post('/pages', authenticateToken, generatorController.savePage);
router.get('/pages', authenticateToken, generatorController.listPages);
router.get('/pages/stats', authenticateToken, generatorController.getStats);
router.get('/pages/:pageId', authenticateToken, generatorController.getPage);
router.put('/pages/:pageId', authenticateToken, generatorController.updatePage);
router.delete('/pages/:pageId', authenticateToken, generatorController.deletePage);
router.post('/pages/:pageId/duplicate', authenticateToken, generatorController.duplicatePage);
router.get('/pages/:pageId/export', authenticateToken, generatorController.exportPage);

// Rota pública (não requer autenticação)
router.get('/public/:slug', generatorController.getPublicPage);

module.exports = router;
