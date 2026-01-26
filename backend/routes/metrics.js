const express = require('express');
const router = express.Router();
const {
  getActivityMetrics,
  getSummaryMetrics
} = require('../controllers/metricsController');
const { authenticateToken } = require('../middleware/auth');
const { uuidValidation } = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

router.get('/summary', getSummaryMetrics);
router.get('/activity/:id', uuidValidation, getActivityMetrics);

module.exports = router;
