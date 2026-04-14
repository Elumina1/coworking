const paymentModel = require('../models/paymentModel');

class PaymentController {
    // Создание нового платежа
    async create(req, res) {
        try {
            const { booking_id, amount, external_id, payment_status } = req.body;
            const payment = await paymentModel.create({
                booking_id,
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
            const payments = await paymentModel.findAll();
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
