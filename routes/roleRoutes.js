const { Router } = require('express')
const RoleController = require('../controllers/roleController')
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware')

const router = new Router()

const postController = new RoleController()
router.post('/post/role', authMiddleware, adminMiddleware, postController.create)

module.exports = router;
