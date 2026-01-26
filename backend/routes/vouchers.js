const express = require('express');
const router = express.Router();
const {
  createVoucher,
  getVouchers,
  getVoucherById,
  redeemVoucher,
  scanQRCode
} = require('../controllers/voucherController');
const { authenticateToken } = require('../middleware/auth');
const { voucherValidation, uuidValidation } = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

router.get('/', getVouchers);
router.post('/', voucherValidation, createVoucher);
router.get('/:id', uuidValidation, getVoucherById);
router.put('/:id/redeem', uuidValidation, redeemVoucher);
router.get('/scan/:qrCode', scanQRCode);

module.exports = router;
