const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const { registerValidation, loginValidation } = require('../middleware/validation');
const { authLimiter } = require('../middleware/rateLimiter');

// Apply rate limiter to all auth routes
router.use(authLimiter);

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);

module.exports = router;
