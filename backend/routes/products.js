const express = require('express');
const router = express.Router();
const {
  getProductsByActivity,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { productValidation, uuidValidation } = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

router.get('/activity/:activityId', getProductsByActivity);
router.post('/activity/:activityId', requireRole('superadmin'), productValidation, createProduct);
router.put('/:id', requireRole('superadmin'), uuidValidation, updateProduct);
router.delete('/:id', requireRole('superadmin'), uuidValidation, deleteProduct);

module.exports = router;
