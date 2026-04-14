const { Router } = require('express')
const RoleController = require('../controllers/roleController')

const router = new Router()

const postController = new RoleController()
router.post('/post/role', postController.create); //маршрут создание новой роли

module.exports = router;
