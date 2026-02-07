const express = require('express');
const router = express.Router();
const { login, me } = require('../controllers/authController');
const { loginValidation } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// Apply rate limiter to login
router.post('/login', authLimiter, loginValidation, login);

// Get current user info (authenticated)
router.get('/me', authenticateToken, me);

module.exports = router;
