const express = require('express');
const router = express.Router();
const {
  getCostsByActivity,
  createCost,
  updateCost,
  deleteCost
} = require('../controllers/costController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { costValidation, uuidValidation } = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

router.get('/activity/:activityId', getCostsByActivity);
router.post('/activity/:activityId', requireRole('comision'), costValidation, createCost);
router.put('/:id', requireRole('comision'), uuidValidation, updateCost);
router.delete('/:id', requireRole('superadmin'), uuidValidation, deleteCost);

module.exports = router;
