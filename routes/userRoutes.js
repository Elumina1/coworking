const { Router } = require('express')
const UserController = require('../controllers/userController')

const router = new Router()
const postController = new UserController()

router.post('/post/user', postController.create); //маршрут добавления нового пользователя
router.get('/get/user', postController.get);// маршрут просмотра всех пользователей
router.delete('/delete/user/:email', postController.delete); // маршрут удаления пользователя по почте
router.put('/update/user/:email', postController.update); // маршрут обновления данных по почте

module.exports = router