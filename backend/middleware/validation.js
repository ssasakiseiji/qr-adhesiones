const { body, param, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  validate
];

const loginValidation = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  validate
];

const activityValidation = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Activity name must be between 3 and 100 characters'),
  body('description')
    .optional()
    .trim(),
  validate
];

const voucherValidation = [
  body('activityId')
    .isUUID()
    .withMessage('Valid activity ID is required'),
  body('customerName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Customer name must be between 2 and 100 characters'),
  body('amount')
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
  validate
];

const uuidValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid ID format'),
  validate
];

module.exports = {
  registerValidation,
  loginValidation,
  activityValidation,
  voucherValidation,
  uuidValidation
};
