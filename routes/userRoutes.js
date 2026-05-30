const { Router } = require('express')
const UserController = require('../controllers/userController')
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware')

const router = new Router()
const postController = new UserController()

router.get('/profile', authMiddleware, postController.getProfile)
router.put('/profile', authMiddleware, postController.updateProfile)
router.put('/profile/password', authMiddleware, postController.changePassword)

router.post('/post/user', authMiddleware, adminMiddleware, postController.create)
router.get('/get/user', authMiddleware, adminMiddleware, postController.get)
router.delete('/delete/user/:email', authMiddleware, adminMiddleware, postController.delete)
router.put('/update/user/:email', authMiddleware, adminMiddleware, postController.update)

module.exports = router
