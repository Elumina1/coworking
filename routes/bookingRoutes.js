const { Router } = require('express')
const BookingController = require('../controllers/bookingController')
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware')
const { body, param, query, validationResult } = require('express-validator')
const router = new Router()

const postController = new BookingController()

const validateRequest = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  next()
}

// Поиск доступных рабочих мест по датам и типу рабочего места
router.get(
  '/search/workspaces',
  authMiddleware,
  [
    query('start_date').isISO8601().withMessage('Неверный формат даты начала'),
    query('end_date').isISO8601().withMessage('Неверный формат даты окончания'),
    query('work_type_id').optional().isInt().withMessage('work_type_id должен быть числом')
  ],
  validateRequest,
  postController.searchAvailable
)

// Просмотр доступных слотов для конкретного рабочего места на определенную дату
router.get(
  '/get/booking/slots/:workspace_id',
  authMiddleware,
  [
    param('workspace_id').isInt().withMessage('workspace_id должен быть числом'),
    query('date').isISO8601().withMessage('Неверный формат даты для слотов')
  ],
  validateRequest,
  postController.getWorkspaceSlots
)

// Создать бронирование (только авторизованный пользователь)
router.post(
  '/post/booking',
  authMiddleware,
  [
    body('workspace_id').isInt().withMessage('workspace_id должен быть числом'),
    body('start_date').isISO8601().withMessage('Неверный формат даты начала'),
    body('end_date').isISO8601().withMessage('Неверный формат даты окончания'),
    body('booking_status').optional().isIn(['pending', 'confirmed', 'cancelled', 'completed'])
  ],
  validateRequest,
  postController.create
)

// Получить список бронирований: пользователь — свои, админ — все
router.get('/get/booking', authMiddleware, postController.get)

// Обновить бронирование (доступно владельцу и админу)
router.put(
  '/update/booking/:id',
  authMiddleware,
  [
    param('id').isInt().withMessage('Идентификатор брони должен быть числом'),
    body('workspace_id').optional().isInt().withMessage('workspace_id должен быть числом'),
    body('start_date').optional().isISO8601().withMessage('Неверный формат даты начала'),
    body('end_date').optional().isISO8601().withMessage('Неверный формат даты окончания'),
    body('booking_status').optional().isIn(['pending', 'confirmed', 'cancelled', 'completed'])
  ],
  validateRequest,
  postController.update
)

// Отменить бронирование (меняет статус на cancelled)
router.patch(
  '/cancel/booking/:id',
  authMiddleware,
  [param('id').isInt().withMessage('Идентификатор брони должен быть числом')],
  validateRequest,
  postController.cancel
)

// Подтвердить бронирование (только админ)
router.patch(
  '/confirm/booking/:id',
  authMiddleware,
  adminMiddleware,
  [param('id').isInt().withMessage('Идентификатор брони должен быть числом')],
  validateRequest,
  postController.confirmBooking
)

// Отправить напоминание о бронировании
router.post(
  '/remind/booking/:id',
  authMiddleware,
  adminMiddleware,
  [param('id').isInt().withMessage('Идентификатор брони должен быть числом')],
  validateRequest,
  postController.sendBookingReminder
)

// Удалить бронирование
router.delete(
  '/delete/booking/:id',
  authMiddleware,
  [param('id').isInt().withMessage('Идентификатор брони должен быть числом')],
  validateRequest,
  postController.delete
)

// Административные отчёты (только для админов)

// Отчёт: Загруженность коворкинга / процент занятых мест
router.get(
  '/reports/occupancy',
  authMiddleware,
  adminMiddleware,
  [
    query('start_date').isISO8601().withMessage('Неверный формат даты начала'),
    query('end_date').isISO8601().withMessage('Неверный формат даты окончания')
  ],
  validateRequest,
  postController.getOccupancyReport
)

// Отчёт: Доходы по периодам
router.get(
  '/reports/revenue',
  authMiddleware,
  adminMiddleware,
  [
    query('start_date').isISO8601().withMessage('Неверный формат даты начала'),
    query('end_date').isISO8601().withMessage('Неверный формат даты окончания'),
    query('group_by').optional().isIn(['day', 'month']).withMessage('group_by должен быть "day" или "month"')
  ],
  validateRequest,
  postController.getRevenueReport
)

// Отчёт: Популярные типы рабочих мест
router.get(
  '/reports/popular-work-types',
  authMiddleware,
  adminMiddleware,
  [
    query('start_date').optional().isISO8601().withMessage('Неверный формат даты начала'),
    query('end_date').optional().isISO8601().withMessage('Неверный формат даты окончания')
  ],
  validateRequest,
  postController.getPopularWorkTypesReport
)

// Отчёт: Отчёт по бронированиям пользователей
router.get(
  '/reports/user-bookings',
  authMiddleware,
  adminMiddleware,
  [
    query('start_date').optional().isISO8601().withMessage('Неверный формат даты начала'),
    query('end_date').optional().isISO8601().withMessage('Неверный формат даты окончания')
  ],
  validateRequest,
  postController.getUserBookingsReport
)

module.exports = router