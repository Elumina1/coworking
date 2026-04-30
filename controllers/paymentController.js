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

const shouldCreateReceipt = String(process.env.YOO_CREATE_RECEIPT).toLowerCase() === 'true';

function normalizePaymentStatus(paymentStatus) {
  if (!paymentStatus && paymentStatus !== 0) {
    return null;
  }
  return String(paymentStatus).trim().toLowerCase();
}

function mapPaymentStatusToBookingStatus(paymentStatus) {
  const normalized = normalizePaymentStatus(paymentStatus);
  if (normalized === 'succeeded') {
    return 'confirmed';
  }
  if (['canceled', 'cancelled', 'refunded'].includes(normalized)) {
    return 'cancelled';
  }
  return null;
}

async function syncBookingStatus(bookingId, paymentStatus) {
  const bookingStatus = mapPaymentStatusToBookingStatus(paymentStatus);
  if (bookingStatus) {
    await bookingModel.update({ booking_status: bookingStatus }, { where: { id: bookingId } });
  }
  return bookingStatus;
}

function appendBookingIdToReturnUrl(returnUrl, bookingId) {
  if (!returnUrl) {
    return `http://localhost:5173/user?payment=return&bookingId=${bookingId}`;
  }

  const url = new URL(returnUrl, 'http://localhost');
  if (url.searchParams.get('payment') !== 'return') {
    url.searchParams.set('payment', 'return');
  }
  url.searchParams.set('bookingId', bookingId);
  return url.toString();
}

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

      await syncBookingStatus(booking_id, payment_status);
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

      let paymentData = null;
      if (existingPayment && existingPayment.external_id) {
        try {
          paymentData = await getYooPayment(existingPayment.external_id);
          const normalizedStatus = normalizePaymentStatus(paymentData.status);
          await existingPayment.update({ payment_status: normalizedStatus || paymentData.status });
          const bookingStatus = await syncBookingStatus(bookingId, normalizedStatus);

          if (normalizedStatus === 'succeeded') {
            return res.json({
              message: 'Платеж уже выполнен, бронирование подтверждено',
              payment: paymentData,
              booking_status: bookingStatus || booking.booking_status
            });
          }

          return res.json({
            message: 'Платеж уже создан, требуется завершить оплату',
            payment: paymentData,
            booking_status: bookingStatus || booking.booking_status,
            confirmation_url: paymentData.confirmation?.confirmation_url
          });
        } catch (paymentError) {
          console.error('Ошибка получения существующего платежа YooKassa:', paymentError);
          // Если существующий платеж не найден или внешний id устарел, создаем новый платеж
        }
      }

      const baseReturnUrl = process.env.YOO_RETURN_URL || 'http://localhost:5173/user?payment=return';
      const returnUrl = appendBookingIdToReturnUrl(baseReturnUrl, booking.id);
      paymentData = await createYooPayment({
        amount: booking.total_price,
        description: `Оплата бронирования #${booking.id}`,
        returnUrl,
        metadata: {
          booking_id: booking.id,
          user_id: booking.user_id
        }
      });

      const normalizedStatus = normalizePaymentStatus(paymentData.status);
      const payment = await paymentModel.create({
        booking_id: booking.id,
        user_id: booking.user_id,
        amount: booking.total_price,
        external_id: paymentData.id,
        payment_status: normalizedStatus || paymentData.status
      });

      await syncBookingStatus(booking.id, normalizedStatus);

      return res.status(201).json({
        message: 'Платеж создан. Перенаправьте пользователя на страницу оплаты',
        payment,
        booking_status: mapPaymentStatusToBookingStatus(normalizedStatus) || booking.booking_status,
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

      let paymentData;
      try {
        paymentData = await getYooPayment(payment.external_id);
      } catch (paymentError) {
        console.error('Ошибка получения статуса платежа YooKassa:', paymentError);
        return res.status(500).json({ message: 'Не удалось получить статус платежа от YooKassa', error: paymentError.message });
      }
      const normalizedStatus = normalizePaymentStatus(paymentData.status);
      const updateData = { payment_status: normalizedStatus || paymentData.status };

      if (normalizedStatus === 'succeeded' && !payment.receipt_id && shouldCreateReceipt) {
        try {
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
        } catch (receiptError) {
          console.error('Ошибка создания чека YooKassa:', receiptError);
          // Не останавливаем обновление статуса бронирования из-за ошибки чека
        }
      }

      await payment.update(updateData);
      const bookingStatus = await syncBookingStatus(bookingId, normalizedStatus);
      const updatedBooking = await bookingModel.findOne({ where: { id: bookingId } });

      return res.json({
        message: 'Статус платежа обновлён',
        payment: paymentData,
        booking_status: bookingStatus || updatedBooking.booking_status,
        booking: updatedBooking
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

      await syncBookingStatus(bookingId, paymentData.status === 'succeeded' ? 'refunded' : 'canceled');

      return res.json({ message: 'Возврат средств инициирован', booking_status: 'cancelled', refund: refundResult });
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
