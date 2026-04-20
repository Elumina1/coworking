const { Router } = require('express')
const UserController = require('../controllers/userController')
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware')

const router = new Router()
const postController = new UserController()

router.post('/post/user', authMiddleware, adminMiddleware, postController.create)
router.get('/get/user', authMiddleware, adminMiddleware, postController.get)
router.delete('/delete/user/:email', authMiddleware, adminMiddleware, postController.delete)
router.put('/update/user/:email', authMiddleware, adminMiddleware, postController.update)

module.exports = router