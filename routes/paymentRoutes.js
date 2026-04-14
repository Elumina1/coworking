const { Router } = require('express');
const PaymentController = require('../controllers/paymentController');

const router = new Router();
const paymentController = new PaymentController();

router.post('/post/payment', paymentController.create);
router.get('/get/payment', paymentController.get);
router.put('/update/payment/:id', paymentController.update);
router.delete('/delete/payment/:id', paymentController.delete);

module.exports = router;
