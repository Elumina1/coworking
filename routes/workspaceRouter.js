const { Router } = require('express')
const WorkspaceController = require('../controllers/workspaceController')
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware')
const router = new Router()

const postController = new WorkspaceController()
router.post('/post/workspace', authMiddleware, adminMiddleware, postController.create)
router.get('/get/workspace', postController.get)
router.delete('/delete/workspace/:id', authMiddleware, adminMiddleware, postController.delete)
router.put('/update/workspace/:id', authMiddleware, adminMiddleware, postController.update)

module.exports = router;