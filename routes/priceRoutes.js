const { Router } = require('express')
const PostController = require('../controllers/priceController')

const router = new Router()

const postController = new PostController()
router.post('/post/price', postController.create); // добавление цены за место
router.put('/update/price/:id', postController.update); // обновление цены за место

module.exports = router