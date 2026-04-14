const { Router } = require('express')
const WorktypeController = require('../controllers/worktypeController')

const router = new Router()

const postController = new WorktypeController()
router.post('/post/worktypes', postController.create); //маршрут создания типа комнаты
router.get('/get/worktypes', postController.get); //маршрут просмотра всех типов комнат
router.delete('/del/worktypes/:id', postController.delete); //маршрут для удаление по айди комнаты
router.put('/update/worktypes/:id', postController.update); //маршрут для обновления по айди комнаты

module.exports = router;