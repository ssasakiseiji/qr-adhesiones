const express = require('express');
const router = express.Router();
const { getAllUsers, createUser, updateUser, deleteUser } = require('../controllers/userController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { createUserValidation, updateUserValidation, uuidValidation } = require('../middleware/validation');

// All user management requires superadmin
router.use(authenticateToken);
router.use(requireRole('superadmin'));

router.get('/', getAllUsers);
router.post('/', createUserValidation, createUser);
router.put('/:id', uuidValidation, updateUserValidation, updateUser);
router.delete('/:id', uuidValidation, deleteUser);

module.exports = router;
