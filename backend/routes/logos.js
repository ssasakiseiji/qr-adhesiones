const express = require('express');
const router = express.Router();
const {
  getAllLogos,
  createLogo,
  deleteLogo
} = require('../controllers/logoController');
const { authenticateToken } = require('../middleware/auth');
const { logoValidation, uuidValidation } = require('../middleware/validation');

router.use(authenticateToken);

router.get('/', getAllLogos);
router.post('/', logoValidation, createLogo);
router.delete('/:id', uuidValidation, deleteLogo);

module.exports = router;
