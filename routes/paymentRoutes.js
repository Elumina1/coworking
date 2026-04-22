const { Router } = require('express');
const PaymentController = require('../controllers/paymentController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

const router = new Router();
const paymentController = new PaymentController();

router.post('/post/payment', authMiddleware, adminMiddleware, paymentController.create);
router.post('/checkout/booking/:bookingId', authMiddleware, paymentController.createCheckout);
router.get('/status/booking/:bookingId', authMiddleware, paymentController.getStatus);
router.post('/refund/booking/:bookingId', authMiddleware, adminMiddleware, paymentController.refund);
router.post('/invoice/booking/:bookingId', authMiddleware, adminMiddleware, paymentController.generateInvoice);
router.get('/get/payment', authMiddleware, adminMiddleware, paymentController.get);
router.put('/update/payment/:id', authMiddleware, adminMiddleware, paymentController.update);
router.delete('/delete/payment/:id', authMiddleware, adminMiddleware, paymentController.delete);

module.exports = router;
