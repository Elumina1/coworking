const notificationModel = require('../models/notificationModel');

class NotificationController {
    // Создание нового уведомления
    async create(req, res) {
        try {
            const { user_id, booking_id, subject, body, status, error_message, sent_at } = req.body;
            const notification = await notificationModel.create({
                user_id,
                booking_id,
                subject,
                body,
                status,
                error_message,
                sent_at
            });
            return res.json(notification);
        } catch (error) {
            return res.status(500).json(error);
        }
    }

    // Получение всех уведомлений
    async get(req, res) {
        try {
            const notifications = await notificationModel.findAll();
            return res.json(notifications);
        } catch (error) {
            return res.status(500).json(error);
        }
    }

    // Обновление уведомления по ID
    async update(req, res) {
        try {
            const { id } = req.params;
            const { user_id, booking_id, subject, body, status, error_message, sent_at } = req.body;
            const update = await notificationModel.update(
                { user_id, booking_id, subject, body, status, error_message, sent_at },
                { where: { id } }
            );
            return res.json(update);
        } catch (error) {
            return res.status(500).json(error);
        }
    }

    // Удаление уведомления по ID
    async delete(req, res) {
        try {
            const { id } = req.params;
            const deleted = await notificationModel.destroy({ where: { id } });
            return res.json(deleted);
        } catch (error) {
            return res.status(500).json(error);
        }
    }
}

module.exports = NotificationController;
