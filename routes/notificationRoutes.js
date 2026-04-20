const { Router } = require('express');
const NotificationController = require('../controllers/notificationController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

const router = new Router();
const postController = new NotificationController();

router.post('/post/notification', authMiddleware, adminMiddleware, postController.create);
router.get('/get/notification', authMiddleware, postController.get);
router.put('/update/notification/:id', authMiddleware, adminMiddleware, postController.update);
router.delete('/delete/notification/:id', authMiddleware, adminMiddleware, postController.delete);

module.exports = router;
