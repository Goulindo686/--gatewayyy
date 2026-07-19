const express = require('express');
const adminController = require('../controllers/admin.controller');
const { auth, adminOnly } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(auth, adminOnly);

router.get('/dashboard', adminController.getDashboard);
router.get('/sellers', adminController.listSellers);
router.put('/sellers/:id/block', adminController.toggleBlockSeller);
router.put('/sellers/:id/pix-fee', adminController.updateSellerPixFee);
router.post('/sellers/:id/impersonate', adminController.impersonateSeller);
router.get('/transactions', adminController.listTransactions);
router.get('/settings', adminController.getSettings);
router.put('/settings/fees', adminController.updateFee);

module.exports = router;
