const express = require('express');
const router = express.Router();
const {
  getProductsByActivity,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');
const { authenticateToken } = require('../middleware/auth');
const { productValidation, uuidValidation } = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

router.get('/activity/:activityId', getProductsByActivity);
router.post('/activity/:activityId', productValidation, createProduct);
router.put('/:id', uuidValidation, updateProduct);
router.delete('/:id', uuidValidation, deleteProduct);

module.exports = router;
