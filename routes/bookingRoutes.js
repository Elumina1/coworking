const { Router } = require('express')
const BookingController = require('../controllers/bookingController')

const router = new Router()

const postController = new BookingController()

router.post('/post/booking', postController.create); 
router.get('/get/booking', postController.get);
router.delete('/delete/booking/:id', postController.delete); 
router.put('/update/booking/:id', postController.update);


module.exports = router