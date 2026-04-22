const bookingModel = require('../models/bookingModel')
const workspaceModel = require('../models/workspaceModel')
const workTypeModel = require('../models/worktypeModels')
const userModel = require('../models/userModel')
const priceModel = require('../models/priceModels')
const paymentModel = require('../models/paymentModel')
const { Op, Sequelize } = require('sequelize')
const { sendEmail, getBookingCreatedTemplate, getBookingConfirmedTemplate } = require('../services/emailService')
const { createYooPayment, getYooPayment, createYooRefund, cancelYooPayment } = require('../services/yooCheckoutService')

class BookingController {
    // Создать новое бронирование
    async create(req, res) {
        try {
            const { workspace_id, start_date, end_date, booking_status } = req.body
            const user_id = req.user.role_id === 1 ? req.body.user_id || req.user.id : req.user.id

            // Проверка обязательных полей
            if (!workspace_id || !start_date || !end_date) {
                return res.status(400).json({ message: 'Заполните все обязательные поля' })
            }

            // Проверка, что дата начала раньше даты окончания
            if (new Date(start_date) >= new Date(end_date)) {
                return res.status(400).json({ message: 'Дата начала должна быть раньше даты окончания' })
            }

            // Проверяем существование рабочего места и его доступность
            const workspace = await workspaceModel.findOne({ where: { id: workspace_id } })
            if (!workspace) {
                return res.status(404).json({ message: 'Рабочее место не найдено' })
            }
            if (!workspace.is_available) {
                return res.status(400).json({ message: 'Рабочее место недоступно' })
            }

            // Проверяем пересечение с существующими активными бронированиями
            const overlappingBooking = await bookingModel.findOne({
                where: {
                    workspace_id,
                    booking_status: { [Op.in]: ['pending', 'confirmed'] },
                    [Op.or]: [
                        {
                            start_date: { [Op.lte]: end_date },
                            end_date: { [Op.gte]: start_date }
                        }
                    ]
                }
            })
            if (overlappingBooking) {
                return res.status(400).json({ message: 'Рабочее место уже забронировано на выбранные даты' })
            }

            // Получаем актуальную цену для типа рабочего места
            const currentPrice = await priceModel.findOne({
                where: { work_type_id: workspace.work_type_id },
                order: [['effective_from', 'DESC']]
            })
            if (!currentPrice) {
                return res.status(400).json({ message: 'Цена для данного типа рабочего места не установлена' })
            }

            // Расчет длительности бронирования в днях
            const days = Math.ceil(
                (new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24)
            )

            const pricePerDay = parseFloat(currentPrice.price_day)
            const totalPrice = pricePerDay * days

            // Сохраняем бронирование в базе
            const booking = await bookingModel.create({
                user_id,
                workspace_id,
                start_date,
                end_date,
                price_per_day: pricePerDay,
                total_price: totalPrice,
                booking_status: booking_status || 'pending'
            })

            // Отправляем уведомление о создании бронирования
            try {
                const user = await userModel.findOne({ where: { id: user_id } })
                const workspaceWithType = await workspaceModel.findOne({
                    where: { id: workspace_id },
                    include: [{ model: workTypeModel, as: 'work_type' }]
                })

                const bookingDetails = {
                    workspaceName: workspaceWithType.workspace_name,
                    workType: workspaceWithType.work_type.type_name,
                    startDate: new Date(start_date).toLocaleDateString('ru-RU'),
                    endDate: new Date(end_date).toLocaleDateString('ru-RU'),
                    totalPrice: totalPrice,
                    status: booking.booking_status
                }

                const emailHtml = getBookingCreatedTemplate(
                    `${user.full_name} ${user.second_name}`,
                    bookingDetails
                )

                await sendEmail(user.email, 'Бронирование создано', emailHtml)
            } catch (emailError) {
                console.error('Ошибка отправки email:', emailError)
                // Не прерываем процесс создания бронирования из-за ошибки email
            }

            return res.status(201).json(booking)
        } catch (error) {
            return res.status(500).json({ message: 'Ошибка сервера', error: error.message })
        }
    }

    // Получить бронирования: пользователь — свои, админ — все
    async get(req, res) {
        try {
            const where = {}
            if (req.user.role_id !== 1) {
                where.user_id = req.user.id
            }
            const bookings = await bookingModel.findAll({
                where,
                include: [
                    {
                        model: userModel,
                        as: 'user',
                        attributes: ['id', 'email', 'full_name', 'second_name']
                    },
                    {
                        model: workspaceModel,
                        as: 'workspace',
                        include: [
                            {
                                model: workTypeModel,
                                as: 'work_type',
                                attributes: ['id', 'type_name']
                            }
                        ]
                    }
                ]
            })
            return res.json(bookings)
        } catch (error) {
            return res.status(500).json({ message: 'Ошибка сервера', error: error.message })
        }
    }

    // Обновить бронирование
    async update(req, res) {
        try {
            const { id } = req.params
            const { workspace_id, start_date, end_date, booking_status } = req.body

            const booking = await bookingModel.findOne({ where: { id } })
            if (!booking) {
                return res.status(404).json({ message: 'Бронирование не найдено' })
            }

            if (req.user.role_id !== 1 && booking.user_id !== req.user.id) {
                return res.status(403).json({ message: 'Недостаточно прав для редактирования этого бронирования' })
            }

            const newWorkspaceId = workspace_id || booking.workspace_id
            const newStartDate = start_date || booking.start_date
            const newEndDate = end_date || booking.end_date

            if (new Date(newStartDate) >= new Date(newEndDate)) {
                return res.status(400).json({ message: 'Дата начала должна быть раньше даты окончания' })
            }

            const workspace = await workspaceModel.findOne({ where: { id: newWorkspaceId } })
            if (!workspace) {
                return res.status(404).json({ message: 'Рабочее место не найдено' })
            }
            if (!workspace.is_available) {
                return res.status(400).json({ message: 'Рабочее место недоступно' })
            }

            const overlappingBooking = await bookingModel.findOne({
                where: {
                    workspace_id: newWorkspaceId,
                    booking_status: { [Op.in]: ['pending', 'confirmed'] },
                    id: { [Op.ne]: id },
                    [Op.or]: [
                        {
                            start_date: { [Op.lte]: newEndDate },
                            end_date: { [Op.gte]: newStartDate }
                        }
                    ]
                }
            })
            if (overlappingBooking) {
                return res.status(400).json({ message: 'Новое время пересекается с существующим бронированием' })
            }

            const updateData = {
                workspace_id: newWorkspaceId,
                start_date: newStartDate,
                end_date: newEndDate,
                booking_status: booking_status || booking.booking_status
            }

            if (req.user.role_id === 1 && req.body.user_id) {
                updateData.user_id = req.body.user_id
            }

            const update = await bookingModel.update(updateData, { where: { id } })
            return res.json(update)
        } catch (error) {
            return res.status(500).json({ message: 'Ошибка сервера', error: error.message })
        }
    }

    // Отменить бронирование — сменить статус на cancelled и инициировать возврат при оплате
    async cancel(req, res) {
        try {
            const { id } = req.params
            const booking = await bookingModel.findOne({ where: { id } })
            if (!booking) {
                return res.status(404).json({ message: 'Бронирование не найдено' })
            }
            if (req.user.role_id !== 1 && booking.user_id !== req.user.id) {
                return res.status(403).json({ message: 'Недостаточно прав для отмены этого бронирования' })
            }

            const payment = await paymentModel.findOne({
                where: { booking_id: id },
                order: [['created_at', 'DESC']]
            })

            if (payment && payment.external_id) {
                try {
                    const paymentData = await getYooPayment(payment.external_id)
                    if (['pending', 'waiting_for_capture'].includes(paymentData.status)) {
                        await cancelYooPayment(paymentData.id)
                        await payment.update({ payment_status: 'canceled' })
                    } else if (paymentData.status === 'succeeded') {
                        const refund = await createYooRefund({
                            paymentId: paymentData.id,
                            amount: payment.amount,
                            description: `Возврат средств за бронирование #${booking.id}`
                        })
                        await payment.update({ payment_status: 'refunded', refund_id: refund.id })
                    }
                } catch (refundError) {
                    console.error('Ошибка возврата средств при отмене бронирования:', refundError)
                }
            }

            const updated = await bookingModel.update({ booking_status: 'cancelled' }, { where: { id } })
            return res.json({ message: 'Бронирование отменено', updated })
        } catch (error) {
            return res.status(500).json({ message: 'Ошибка сервера', error: error.message })
        }
    }

    // Поиск доступных рабочих мест по диапазону дат и типу рабочего места
    async searchAvailable(req, res) {
        try {
            const { start_date, end_date, work_type_id } = req.query

            if (new Date(start_date) >= new Date(end_date)) {
                return res.status(400).json({ message: 'Дата начала должна быть раньше даты окончания' })
            }

            const booked = await bookingModel.findAll({
                attributes: ['workspace_id'],
                where: {
                    booking_status: { [Op.in]: ['pending', 'confirmed'] },
                    [Op.or]: [
                        {
                            start_date: { [Op.lte]: end_date },
                            end_date: { [Op.gte]: start_date }
                        }
                    ]
                },
                group: ['workspace_id']
            })

            const bookedWorkspaceIds = booked.map(item => item.workspace_id)

            const workspaceWhere = { is_available: true }
            if (work_type_id) {
                workspaceWhere.work_type_id = work_type_id
            }
            if (bookedWorkspaceIds.length > 0) {
                workspaceWhere.id = { [Op.notIn]: bookedWorkspaceIds }
            }

            const availableWorkspaces = await workspaceModel.findAll({ where: workspaceWhere })
            return res.json({ availableWorkspaces })
        } catch (error) {
            return res.status(500).json({ message: 'Ошибка сервера', error: error.message })
        }
    }

    // Получение доступных слотов для рабочего места на конкретную дату
    async getWorkspaceSlots(req, res) {
        try {
            const { workspace_id } = req.params
            const { date } = req.query

            const workspace = await workspaceModel.findOne({ where: { id: workspace_id } })
            if (!workspace) {
                return res.status(404).json({ message: 'Рабочее место не найдено' })
            }

            const requestedDate = new Date(date)
            requestedDate.setHours(0, 0, 0, 0)
            const dayStart = new Date(requestedDate)
            const dayEnd = new Date(requestedDate)
            dayEnd.setHours(23, 59, 59, 999)

            // Загружаем активные бронирования этого места на выбранную дату
            const bookings = await bookingModel.findAll({
                where: {
                    workspace_id,
                    booking_status: { [Op.in]: ['pending', 'confirmed'] },
                    start_date: { [Op.lte]: dayEnd },
                    end_date: { [Op.gte]: dayStart }
                }
            })

            const busyRanges = bookings.map(item => ({
                start: new Date(item.start_date),
                end: new Date(item.end_date)
            }))

            const slots = []
            const workStartHour = 9
            const workEndHour = 18

            for (let hour = workStartHour; hour < workEndHour; hour++) {
                const slotStart = new Date(requestedDate)
                slotStart.setHours(hour, 0, 0, 0)
                const slotEnd = new Date(requestedDate)
                slotEnd.setHours(hour + 1, 0, 0, 0)

                const isBusy = busyRanges.some(range =>
                    slotStart < range.end && slotEnd > range.start
                )

                if (!isBusy) {
                    slots.push({
                        start: slotStart.toISOString(),
                        end: slotEnd.toISOString()
                    })
                }
            }

            return res.json({ workspace_id, date: requestedDate.toISOString().slice(0, 10), slots })
        } catch (error) {
            return res.status(500).json({ message: 'Ошибка сервера', error: error.message })
        }
    }

    // Подтвердить бронирование (меняет статус на confirmed и отправляет email)
    async confirmBooking(req, res) {
        try {
            const { id } = req.params
            const booking = await bookingModel.findOne({
                where: { id },
                include: [
                    { model: userModel, as: 'user' },
                    {
                        model: workspaceModel,
                        as: 'workspace',
                        include: [{ model: workTypeModel, as: 'work_type' }]
                    }
                ]
            })

            if (!booking) {
                return res.status(404).json({ message: 'Бронирование не найдено' })
            }

            const existingPayment = await paymentModel.findOne({
                where: { booking_id: id },
                order: [['created_at', 'DESC']]
            })

            if (existingPayment && existingPayment.external_id) {
                const paymentData = await getYooPayment(existingPayment.external_id)
                await existingPayment.update({ payment_status: paymentData.status })

                if (paymentData.status === 'succeeded') {
                    await bookingModel.update({ booking_status: 'confirmed' }, { where: { id } })
                }

                return res.json({
                    message: paymentData.status === 'succeeded' ? 'Бронирование подтверждено' : 'Оплата ещё не завершена',
                    payment: paymentData,
                    confirmation_url: paymentData.confirmation?.confirmation_url
                })
            }

            const returnUrl = process.env.YOO_RETURN_URL || 'http://localhost:3000/payment/success'
            const paymentData = await createYooPayment({
                amount: booking.total_price,
                description: `Оплата бронирования #${booking.id}`,
                returnUrl,
                metadata: {
                    booking_id: booking.id,
                    user_id: booking.user_id
                }
            })

            await paymentModel.create({
                booking_id: booking.id,
                user_id: booking.user_id,
                amount: booking.total_price,
                external_id: paymentData.id,
                payment_status: paymentData.status
            })

            return res.status(201).json({
                message: 'Создан платеж YooKassa для подтверждения бронирования',
                confirmation_url: paymentData.confirmation?.confirmation_url,
                payment: paymentData
            })
        } catch (error) {
            return res.status(500).json({ message: 'Ошибка сервера', error: error.message })
        }
    }

    // Отправить напоминание о бронировании
    async sendBookingReminder(req, res) {
        try {
            const { id } = req.params
            const booking = await bookingModel.findOne({
                where: { id },
                include: [
                    { model: userModel, as: 'user' },
                    {
                        model: workspaceModel,
                        as: 'workspace',
                        include: [{ model: workTypeModel, as: 'work_type' }]
                    }
                ]
            })

            if (!booking) {
                return res.status(404).json({ message: 'Бронирование не найдено' })
            }

            const now = new Date()
            const startTime = new Date(booking.start_date)
            const hoursUntilStart = Math.round((startTime - now) / (1000 * 60 * 60))

            if (hoursUntilStart <= 0) {
                return res.status(400).json({ message: 'Бронирование уже началось или прошло' })
            }

            // Отправляем напоминание
            try {
                const bookingDetails = {
                    workspaceName: booking.workspace.workspace_name,
                    workType: booking.workspace.work_type.type_name,
                    startDate: startTime.toLocaleString('ru-RU')
                }

                const { getBookingReminderTemplate } = require('../services/emailService')
                const emailHtml = getBookingReminderTemplate(
                    `${booking.user.full_name} ${booking.user.second_name}`,
                    bookingDetails,
                    hoursUntilStart
                )

                await sendEmail(booking.user.email, 'Напоминание о бронировании', emailHtml)
                return res.json({ message: 'Напоминание отправлено' })
            } catch (emailError) {
                console.error('Ошибка отправки напоминания:', emailError)
                return res.status(500).json({ message: 'Ошибка отправки напоминания' })
            }
        } catch (error) {
            return res.status(500).json({ message: 'Ошибка сервера', error: error.message })
        }
    }

    // Отчёт: Загруженность коворкинга / процент занятых мест
    // Возвращает статистику по дате или периоду
    async getOccupancyReport(req, res) {
        try {
            const { start_date, end_date } = req.query

            if (!start_date || !end_date) {
                return res.status(400).json({ message: 'Укажите start_date и end_date' })
            }

            // Получаем общее количество рабочих мест
            const totalWorkspaces = await workspaceModel.count()

            // Получаем количество занятых мест в периоде
            const occupiedBookings = await bookingModel.findAll({
                where: {
                    booking_status: { [Op.in]: ['pending', 'confirmed'] },
                    [Op.or]: [
                        {
                            start_date: { [Op.lte]: end_date },
                            end_date: { [Op.gte]: start_date }
                        }
                    ]
                },
                attributes: ['workspace_id'],
                group: ['workspace_id']
            })

            const occupiedCount = occupiedBookings.length
            const occupancyPercentage = totalWorkspaces > 0 ? (occupiedCount / totalWorkspaces) * 100 : 0

            return res.json({
                totalWorkspaces,
                occupiedWorkspaces: occupiedCount,
                occupancyPercentage: Math.round(occupancyPercentage * 100) / 100,
                period: { start_date, end_date }
            })
        } catch (error) {
            return res.status(500).json({ message: 'Ошибка сервера', error: error.message })
        }
    }

    // Отчёт: Доходы по периодам
    // Группирует доходы по месяцам или дням
    async getRevenueReport(req, res) {
        try {
            const { start_date, end_date, group_by = 'month' } = req.query

            if (!start_date || !end_date) {
                return res.status(400).json({ message: 'Укажите start_date и end_date' })
            }

            let dateFormat
            if (group_by === 'day') {
                dateFormat = Sequelize.fn('DATE', Sequelize.col('start_date'))
            } else if (group_by === 'month') {
                dateFormat = Sequelize.fn('DATE_FORMAT', Sequelize.col('start_date'), '%Y-%m')
            } else {
                return res.status(400).json({ message: 'group_by должен быть "day" или "month"' })
            }

            const revenueData = await bookingModel.findAll({
                where: {
                    booking_status: { [Op.in]: ['confirmed', 'completed'] },
                    start_date: { [Op.gte]: start_date },
                    end_date: { [Op.lte]: end_date }
                },
                attributes: [
                    [dateFormat, 'period'],
                    [Sequelize.fn('SUM', Sequelize.col('total_price')), 'total_revenue']
                ],
                group: ['period'],
                order: [['period', 'ASC']]
            })

            const totalRevenue = await bookingModel.sum('total_price', {
                where: {
                    booking_status: { [Op.in]: ['confirmed', 'completed'] },
                    start_date: { [Op.gte]: start_date },
                    end_date: { [Op.lte]: end_date }
                }
            })

            return res.json({
                totalRevenue: totalRevenue || 0,
                revenueByPeriod: revenueData,
                period: { start_date, end_date },
                groupBy: group_by
            })
        } catch (error) {
            return res.status(500).json({ message: 'Ошибка сервера', error: error.message })
        }
    }

    // Отчёт: Популярные типы рабочих мест
    // Группирует бронирования по типам рабочих мест
    async getPopularWorkTypesReport(req, res) {
        try {
            const { start_date, end_date } = req.query

            const whereCondition = {
                booking_status: { [Op.in]: ['confirmed', 'completed'] }
            }

            if (start_date && end_date) {
                whereCondition.start_date = { [Op.gte]: start_date }
                whereCondition.end_date = { [Op.lte]: end_date }
            }

            const popularTypes = await bookingModel.findAll({
                where: whereCondition,
                include: [
                    {
                        model: workspaceModel,
                        as: 'workspace',
                        include: [
                            {
                                model: workTypeModel,
                                as: 'work_type',
                                attributes: ['id', 'type_name']
                            }
                        ]
                    }
                ],
                attributes: [
                    [Sequelize.fn('COUNT', Sequelize.col('booking.id')), 'booking_count']
                ],
                group: ['workspace.work_type_id'],
                order: [[Sequelize.fn('COUNT', Sequelize.col('booking.id')), 'DESC']]
            })

            return res.json({
                popularWorkTypes: popularTypes.map(item => ({
                    work_type_id: item.workspace.work_type.id,
                    type_name: item.workspace.work_type.type_name,
                    booking_count: item.dataValues.booking_count
                })),
                period: start_date && end_date ? { start_date, end_date } : null
            })
        } catch (error) {
            return res.status(500).json({ message: 'Ошибка сервера', error: error.message })
        }
    }

    // Отчёт: Отчёт по бронированиям пользователей
    // Группирует бронирования по пользователям
    async getUserBookingsReport(req, res) {
        try {
            const { start_date, end_date } = req.query

            const whereCondition = {
                booking_status: { [Op.in]: ['confirmed', 'completed'] }
            }

            if (start_date && end_date) {
                whereCondition.start_date = { [Op.gte]: start_date }
                whereCondition.end_date = { [Op.lte]: end_date }
            }

            const userBookings = await bookingModel.findAll({
                where: whereCondition,
                include: [
                    {
                        model: userModel,
                        as: 'user',
                        attributes: ['id', 'email', 'full_name', 'second_name']
                    }
                ],
                attributes: [
                    'user_id',
                    [Sequelize.fn('COUNT', Sequelize.col('booking.id')), 'booking_count'],
                    [Sequelize.fn('SUM', Sequelize.col('total_price')), 'total_spent']
                ],
                group: ['user_id'],
                order: [[Sequelize.fn('SUM', Sequelize.col('total_price')), 'DESC']]
            })

            return res.json({
                userBookings: userBookings.map(item => ({
                    user_id: item.user_id,
                    user: item.user,
                    booking_count: item.dataValues.booking_count,
                    total_spent: parseFloat(item.dataValues.total_spent)
                })),
                period: start_date && end_date ? { start_date, end_date } : null
            })
        } catch (error) {
            return res.status(500).json({ message: 'Ошибка сервера', error: error.message })
        }
    }
}

module.exports = BookingController