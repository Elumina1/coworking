const AutController = require('../controllers/authController')
const { Router } = require('express')
const { authMidlleware } = require('../middleware/authMiddleware')

const router = new Router()

const autController = new AutController()

router.post('/register', autController.register.bind(autController)) // роут на регистрацию пользователя
router.post('/login', autController.login.bind(autController)) // маршрут для авторизации

module.exports = router