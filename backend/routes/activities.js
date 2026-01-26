const express = require('express');
const router = express.Router();
const {
  getAllActivities,
  createActivity,
  updateActivity,
  deleteActivity
} = require('../controllers/activityController');
const { authenticateToken } = require('../middleware/auth');
const { activityValidation, uuidValidation } = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

router.get('/', getAllActivities);
router.post('/', activityValidation, createActivity);
router.put('/:id', uuidValidation, activityValidation, updateActivity);
router.delete('/:id', uuidValidation, deleteActivity);

module.exports = router;
