const express = require('express');
const router = express.Router();
const {
  getAllLogos,
  createLogo,
  deleteLogo
} = require('../controllers/logoController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logoValidation, uuidValidation } = require('../middleware/validation');

router.use(authenticateToken);

router.get('/', getAllLogos);
router.post('/', requireRole('superadmin'), logoValidation, createLogo);
router.delete('/:id', requireRole('superadmin'), uuidValidation, deleteLogo);

module.exports = router;
