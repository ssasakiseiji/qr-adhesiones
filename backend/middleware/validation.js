const { body, param, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const loginValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  validate
];

const createUserValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .optional({ values: 'null' })
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .optional()
    .isIn(['esbirro', 'comision', 'superadmin'])
    .withMessage('Role must be esbirro, comision, or superadmin'),
  validate
];

const updateUserValidation = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .optional({ values: 'null' })
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .optional()
    .isIn(['esbirro', 'comision', 'superadmin'])
    .withMessage('Role must be esbirro, comision, or superadmin'),
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
  body('items')
    .optional({ values: 'null' })
    .isArray()
    .withMessage('Items must be an array'),
  validate
];

const uuidValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid ID format'),
  validate
];

const logoValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Logo name is required (max 100 characters)'),
  body('svgContent')
    .notEmpty()
    .withMessage('SVG content is required'),
  validate
];

const productValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Product name must be between 2 and 100 characters'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  validate
];

const templateValidation = [
  body('templateTitle')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Template title must be at most 200 characters'),
  body('templateProductName')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Product name must be at most 200 characters'),
  body('templateBgColor')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Background color must be a valid hex color'),
  body('templateBgColor2')
    .optional({ values: 'null' })
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Gradient color must be a valid hex color'),
  body('templateTextColor')
    .optional()
    .isIn(['#ffffff', '#000000'])
    .withMessage('Text color must be #ffffff or #000000'),
  body('templateLogoSize')
    .optional()
    .isInt()
    .isIn([100, 140, 180, 220, 260])
    .withMessage('Logo size must be 100, 140, 180, 220, or 260'),
  body('templateLogoId')
    .optional({ values: 'null' })
    .isUUID()
    .withMessage('Logo ID must be a valid UUID'),
  body('pickupDate')
    .optional({ values: 'null' })
    .isDate()
    .withMessage('Pickup date must be a valid date (YYYY-MM-DD)'),
  body('pickupStartTime')
    .optional({ values: 'null' })
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
    .withMessage('Start time must be in HH:mm format'),
  body('pickupEndTime')
    .optional({ values: 'null' })
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
    .withMessage('End time must be in HH:mm format'),
  validate
];

module.exports = {
  loginValidation,
  createUserValidation,
  updateUserValidation,
  activityValidation,
  voucherValidation,
  uuidValidation,
  logoValidation,
  productValidation,
  templateValidation
};
