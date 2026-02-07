const express = require('express');
const router = express.Router();
const {
  getActivityMetrics,
  getSummaryMetrics
} = require('../controllers/metricsController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { uuidValidation } = require('../middleware/validation');

// All routes require authentication + comision role minimum
router.use(authenticateToken);
router.use(requireRole('comision'));

router.get('/summary', getSummaryMetrics);
router.get('/activity/:id', uuidValidation, getActivityMetrics);

module.exports = router;
