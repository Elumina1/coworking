const bookingModel = require('../models/bookingModel')
const workspaceModel = require('../models/workspaceModel')
const priceModel = require('../models/priceModels')
const { Op } = require('sequelize')

class BookingController {
    async create(req, res) {
        try {
            const { user_id, workspace_id, start_date, end_date, booking_status } = req.body

            // Проверка заполненности полей
            if (!user_id || !workspace_id || !start_date || !end_date) {
                return res.status(400).json({ message: 'Заполните все обязательные поля' })
            }

            // Проверка: start_date < end_date
            if (new Date(start_date) >= new Date(end_date)) {
                return res.status(400).json({ message: 'Дата начала должна быть раньше даты окончания' })
            }

            // Проверка: рабочее место существует и доступно
            const workspace = await workspaceModel.findOne({ where: { id: workspace_id } })
            if (!workspace) {
                return res.status(404).json({ message: 'Рабочее место не найдено' })
            }
            if (!workspace.is_available) {
                return res.status(400).json({ message: 'Рабочее место недоступно' })
            }

            // Проверка: нет ли пересекающихся бронирований на это рабочее место
            const overlappingBooking = await bookingModel.findOne({
                where: {
                    workspace_id,
                    booking_status: { [Op.in]: ['pending', 'confirmed'] },
                    [Op.or]: [
                        // Новое бронирование начинается внутри существующего
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

            // Получаем актуальную цену для work_type_id этого рабочего места
            const currentPrice = await priceModel.findOne({
                where: { work_type_id: workspace.work_type_id },
                order: [['effective_from', 'DESC']] // берём самую свежую цену
            })
            if (!currentPrice) {
                return res.status(400).json({ message: 'Цена для данного типа рабочего места не установлена' })
            }

            // Рассчитываем количество дней
            const days = Math.ceil(
                (new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24)
            )

            // Рассчитываем цены
            const pricePerDay = parseFloat(currentPrice.price_day)
            const totalPrice = pricePerDay * days

            // Создаём бронирование
            const booking = await bookingModel.create({
                user_id,
                workspace_id,
                start_date,
                end_date,
                price_per_day: pricePerDay,
                total_price: totalPrice,
                booking_status: booking_status || 'pending'
            })

            return res.status(201).json(booking)
        } catch (error) {
            return res.status(500).json({ message: 'Ошибка сервера', error: error.message })
        }
    }

    async get(req, res) {
        try {
            const bookings = await bookingModel.findAll()
            return res.json(bookings)
        } catch (error) {
            return res.status(500).json({ message: 'Ошибка сервера', error: error.message })
        }
    }

    async update(req, res) {
        try {
            const { id } = req.params
            const { user_id, workspace_id, start_date, end_date, booking_status } = req.body

            const update = await bookingModel.update(
                { user_id, workspace_id, start_date, end_date, booking_status },
                { where: { id } }
            )
            return res.json(update)
        } catch (error) {
            return res.status(500).json({ message: 'Ошибка сервера', error: error.message })
        }
    }

    async delete(req, res) {
        try {
            const { id } = req.params
            const del = await bookingModel.destroy({ where: { id } })
            return res.json(del)
        } catch (error) {
            return res.status(500).json({ message: 'Ошибка сервера', error: error.message })
        }
    }
}

module.exports = BookingController