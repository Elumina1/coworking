const { Router } = require('express')
const WorkspaceController = require('../controllers/workspaceController')

const router = new Router()

const postController = new WorkspaceController()
router.post('/post/workspace', postController.create); //маршрут добавления нового рабочего места
router.get('/get/workspace', postController.get);// маршрут просмотра всез мест
router.delete('/delete/workspace/:id', postController.delete); // маршрут удаления места по айди
router.put('/update/workspace/:id', postController.update); // маршрут обновления данных по айди

module.exports = router;