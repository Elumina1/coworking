const AuthController = require('../controllers/authController')
const { Router } = require('express')
const { body, validationResult } = require('express-validator')

const router = new Router()
const authController = new AuthController()

const validateRequest = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  next()
}

router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Неверный email').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Пароль должен быть не менее 6 символов'),
    body('full_name').notEmpty().withMessage('Укажите имя'),
    body('second_name').notEmpty().withMessage('Укажите фамилию')
  ],
  validateRequest,
  authController.register.bind(authController)
)

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Неверный email').normalizeEmail(),
    body('password').notEmpty().withMessage('Укажите пароль')
  ],
  validateRequest,
  authController.login.bind(authController)
)

module.exports = router