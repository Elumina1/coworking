const { Router } = require('express');
const NotificationController = require('../controllers/notificationController');

const router = new Router();
const postController = new NotificationController();

router.post('/post/notification', postController.create);
router.get('/get/notification', postController.get);
router.put('/update/notification/:id', postController.update);
router.delete('/delete/notification/:id', postController.delete);

module.exports = router;
