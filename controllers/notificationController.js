const notificationModel = require('../models/notificationModel');
const bookingModel = require('../models/bookingModel');
const userModel = require('../models/userModel');
const workspaceModel = require('../models/workspaceModel');
const workTypeModel = require('../models/worktypeModels');

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
            // Возвращаем уведомления с вложенными данными о пользователе и бронировании
            const notifications = await notificationModel.findAll({
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
