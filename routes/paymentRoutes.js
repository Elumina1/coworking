const { Router } = require('express');
const PaymentController = require('../controllers/paymentController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

const router = new Router();
const paymentController = new PaymentController();

router.post('/post/payment', authMiddleware, adminMiddleware, paymentController.create);
router.get('/get/payment', authMiddleware, adminMiddleware, paymentController.get);
router.put('/update/payment/:id', authMiddleware, adminMiddleware, paymentController.update);
router.delete('/delete/payment/:id', authMiddleware, adminMiddleware, paymentController.delete);

module.exports = router;
