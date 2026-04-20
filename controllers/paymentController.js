const paymentModel = require('../models/paymentModel');
const bookingModel = require('../models/bookingModel');
const userModel = require('../models/userModel');
const workspaceModel = require('../models/workspaceModel');
const workTypeModel = require('../models/worktypeModels');

class PaymentController {
    // Создание нового платежа
    async create(req, res) {
        try {
            const { booking_id, amount, external_id, payment_status } = req.body;

            // Находим бронирование и связываем платеж с пользователем этого бронирования
            const booking = await bookingModel.findOne({ where: { id: booking_id } });
            if (!booking) {
                return res.status(404).json({ message: 'Бронирование не найдено' });
            }

            const payment = await paymentModel.create({
                booking_id,
                user_id: booking.user_id,
                amount,
                external_id,
                payment_status
            });
            return res.json(payment);
        } catch (error) {
            return res.status(500).json(error);
        }
    }

    // Получение всех платежей
    async get(req, res) {
        try {
            const payments = await paymentModel.findAll({
                include: [
                    {
                        model: userModel,
                        as: 'user',
                        attributes: ['id', 'email', 'full_name', 'second_name']
                    },
                    {
                        model: bookingModel,
                        as: 'booking',
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
                        ]
                    }
                ]
            });
            return res.json(payments);
        } catch (error) {
            return res.status(500).json(error);
        }
    }

    // Обновление платежа по ID
    async update(req, res) {
        try {
            const { id } = req.params;
            const { booking_id, amount, external_id, payment_status } = req.body;
            const update = await paymentModel.update(
                { booking_id, amount, external_id, payment_status },
                { where: { id } }
            );
            return res.json(update);
        } catch (error) {
            return res.status(500).json(error);
        }
    }

    // Удаление платежа по ID
    async delete(req, res) {
        try {
            const { id } = req.params;
            const deleted = await paymentModel.destroy({ where: { id } });
            return res.json(deleted);
        } catch (error) {
            return res.status(500).json(error);
        }
    }
}

module.exports = PaymentController;
