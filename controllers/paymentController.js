const paymentModel = require('../models/paymentModel');
const bookingModel = require('../models/bookingModel');
const userModel = require('../models/userModel');
const workspaceModel = require('../models/workspaceModel');
const workTypeModel = require('../models/worktypeModels');
const {
  createYooPayment,
  getYooPayment,
  cancelYooPayment,
  createYooRefund,
  createYooReceipt
} = require('../services/yooCheckoutService');

class PaymentController {
  // Создание нового платежа вручную (админ)
  async create(req, res) {
    try {
      const { booking_id, amount, external_id, payment_status } = req.body;

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

  // Создание чека YooKassa для бронирования
  async createCheckout(req, res) {
    try {
      const { bookingId } = req.params;
      const booking = await bookingModel.findOne({
        where: { id: bookingId },
        include: [
          {
            model: userModel,
            as: 'user',
            attributes: ['id', 'email', 'full_name', 'second_name']
          },
          {
            model: workspaceModel,
            as: 'workspace',
            include: [{ model: workTypeModel, as: 'work_type' }]
          }
        ]
      });

      if (!booking) {
        return res.status(404).json({ message: 'Бронирование не найдено' });
      }

      const existingPayment = await paymentModel.findOne({
        where: { booking_id: bookingId },
        order: [['created_at', 'DESC']]
      });

      if (existingPayment && existingPayment.external_id) {
        const paymentData = await getYooPayment(existingPayment.external_id);
        await existingPayment.update({ payment_status: paymentData.status });

        if (paymentData.status === 'succeeded') {
          await bookingModel.update({ booking_status: 'confirmed' }, { where: { id: bookingId } });
          return res.json({
            message: 'Платеж уже выполнен, бронирование подтверждено',
            payment: paymentData
          });
        }

        return res.json({
          message: 'Платеж уже создан, требуется завершить оплату',
          payment: paymentData,
          confirmation_url: paymentData.confirmation?.confirmation_url
        });
      }

      const returnUrl = process.env.YOO_RETURN_URL || 'http://localhost:3000/payment/success';
      const paymentData = await createYooPayment({
        amount: booking.total_price,
        description: `Оплата бронирования #${booking.id}`,
        returnUrl,
        metadata: {
          booking_id: booking.id,
          user_id: booking.user_id
        }
      });

      const payment = await paymentModel.create({
        booking_id: booking.id,
        user_id: booking.user_id,
        amount: booking.total_price,
        external_id: paymentData.id,
        payment_status: paymentData.status
      });

      return res.status(201).json({
        message: 'Платеж создан. Перенаправьте пользователя на страницу оплаты',
        payment,
        confirmation_url: paymentData.confirmation?.confirmation_url
      });
    } catch (error) {
      return res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
  }

  // Проверка статуса платежа и генерация чека/инвойса
  async getStatus(req, res) {
    try {
      const { bookingId } = req.params;
      const booking = await bookingModel.findOne({
        where: { id: bookingId },
        include: [
          {
            model: userModel,
            as: 'user',
            attributes: ['id', 'email', 'full_name', 'second_name']
          },
          {
            model: workspaceModel,
            as: 'workspace',
            include: [{ model: workTypeModel, as: 'work_type' }]
          }
        ]
      });

      if (!booking) {
        return res.status(404).json({ message: 'Бронирование не найдено' });
      }

      const payment = await paymentModel.findOne({
        where: { booking_id: bookingId },
        order: [['created_at', 'DESC']]
      });

      if (!payment || !payment.external_id) {
        return res.status(404).json({ message: 'Платеж не найден для этого бронирования' });
      }

      const paymentData = await getYooPayment(payment.external_id);
      const updateData = { payment_status: paymentData.status };

      if (paymentData.status === 'succeeded' && !payment.receipt_id) {
        const receipt = await createYooReceipt({
          paymentId: paymentData.id,
          customer: {
            email: booking.user.email
          },
          items: [
            {
              description: `Бронирование ${booking.workspace.workspace_name}`,
              quantity: '1.00',
              amount: {
                value: Number(booking.total_price).toFixed(2),
                currency: 'RUB'
              },
              vat_code: 1
            }
          ],
          tax_system_code: 1
        });

        updateData.receipt_id = receipt.id;
      }

      await payment.update(updateData);

      if (paymentData.status === 'succeeded') {
        await bookingModel.update({ booking_status: 'confirmed' }, { where: { id: bookingId } });
      }

      return res.json({
        message: 'Статус платежа обновлён',
        payment: paymentData,
        booking_status: paymentData.status === 'succeeded' ? 'confirmed' : booking.booking_status
      });
    } catch (error) {
      return res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
  }

  // Возврат средств через YooKassa
  async refund(req, res) {
    try {
      const { bookingId } = req.params;
      const booking = await bookingModel.findOne({ where: { id: bookingId } });
      if (!booking) {
        return res.status(404).json({ message: 'Бронирование не найдено' });
      }

      const payment = await paymentModel.findOne({
        where: { booking_id: bookingId },
        order: [['created_at', 'DESC']]
      });

      if (!payment || !payment.external_id) {
        return res.status(404).json({ message: 'Платеж не найден для возврата' });
      }

      const paymentData = await getYooPayment(payment.external_id);
      let refundResult;

      if (['pending', 'waiting_for_capture'].includes(paymentData.status)) {
        refundResult = await cancelYooPayment(paymentData.id);
        await payment.update({ payment_status: 'canceled' });
      } else if (paymentData.status === 'succeeded') {
        refundResult = await createYooRefund({
          paymentId: paymentData.id,
          amount: payment.amount,
          description: `Возврат за бронирование #${bookingId}`
        });
        await payment.update({ payment_status: 'refunded', refund_id: refundResult.id });
      } else {
        return res.status(400).json({ message: `Невозможно сделать возврат для статуса ${paymentData.status}` });
      }

      await bookingModel.update({ booking_status: 'cancelled' }, { where: { id: bookingId } });

      return res.json({ message: 'Возврат средств инициирован', refund: refundResult });
    } catch (error) {
      return res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
  }

  // Генерация инвойса / чека YooKassa вручную
  async generateInvoice(req, res) {
    try {
      const { bookingId } = req.params;
      const booking = await bookingModel.findOne({
        where: { id: bookingId },
        include: [
          {
            model: userModel,
            as: 'user',
            attributes: ['id', 'email', 'full_name', 'second_name']
          },
          {
            model: workspaceModel,
            as: 'workspace',
            include: [{ model: workTypeModel, as: 'work_type' }]
          }
        ]
      });

      if (!booking) {
        return res.status(404).json({ message: 'Бронирование не найдено' });
      }

      const payment = await paymentModel.findOne({
        where: { booking_id: bookingId },
        order: [['created_at', 'DESC']]
      });

      if (!payment || !payment.external_id) {
        return res.status(404).json({ message: 'Платеж не найден для генерации инвойса' });
      }

      const paymentData = await getYooPayment(payment.external_id);
      if (paymentData.status !== 'succeeded') {
        return res.status(400).json({ message: 'Инвойс можно создать только для успешно оплаченного платежа' });
      }

      const receipt = await createYooReceipt({
        paymentId: paymentData.id,
        customer: {
          email: booking.user.email
        },
        items: [
          {
            description: `Бронирование ${booking.workspace.workspace_name}`,
            quantity: '1.00',
            amount: {
              value: Number(booking.total_price).toFixed(2),
              currency: 'RUB'
            },
            vat_code: 1
          }
        ],
        tax_system_code: 1
      });

      await payment.update({ receipt_id: receipt.id });
      return res.json({ message: 'Инвойс создан', receipt });
    } catch (error) {
      return res.status(500).json({ message: 'Ошибка сервера', error: error.message });
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
