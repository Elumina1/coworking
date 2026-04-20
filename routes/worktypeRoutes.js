const { Router } = require('express')
const WorktypeController = require('../controllers/worktypeController')
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware')
const router = new Router()

const postController = new WorktypeController()
router.post('/post/worktypes', authMiddleware, adminMiddleware, postController.create)
router.get('/get/worktypes', postController.get)
router.delete('/del/worktypes/:id', authMiddleware, adminMiddleware, postController.delete)
router.put('/update/worktypes/:id', authMiddleware, adminMiddleware, postController.update)

module.exports = router;