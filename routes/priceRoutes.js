const { Router } = require('express')
const PostController = require('../controllers/priceController')
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware')
const router = new Router()

const postController = new PostController()
router.get('/get/price', authMiddleware, adminMiddleware, postController.get)
router.post('/post/price', authMiddleware, adminMiddleware, postController.create)
router.put('/update/price/:id', authMiddleware, adminMiddleware, postController.update)

module.exports = router
