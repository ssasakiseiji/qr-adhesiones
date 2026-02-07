const express = require('express');
const router = express.Router();
const {
  getAllActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  updateTemplate
} = require('../controllers/activityController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { activityValidation, uuidValidation, templateValidation } = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

router.get('/', getAllActivities);
router.post('/', requireRole('superadmin'), activityValidation, createActivity);
router.put('/:id', requireRole('superadmin'), uuidValidation, activityValidation, updateActivity);
router.put('/:id/template', requireRole('superadmin'), uuidValidation, templateValidation, updateTemplate);
router.delete('/:id', requireRole('superadmin'), uuidValidation, deleteActivity);

module.exports = router;
