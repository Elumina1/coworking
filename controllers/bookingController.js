const bookingModel = require('../models/bookingModel')
const workspaceModel = require('../models/workspaceModel')
const workTypeModel = require('../models/worktypeModels')
const userModel = require('../models/userModel')
const priceModel = require('../models/priceModels')
const paymentModel = require('../models/paymentModel')
const { Op, Sequelize } = require('sequelize')
const { sendEmail, getBookingCreatedTemplate, getBookingConfirmedTemplate, getBookingReminderTemplate } = require('../services/emailService')
const { createYooPayment, getYooPayment, createYooRefund, cancelYooPayment } = require('../services/yooCheckoutService')

function runInBackground(task, label) {
  Promise.resolve()
    .then(task)
    .catch((error) => {
      console.error(`Ошибка фоновой задачи ${label}:`, error.message)
    })
}

function getBookingIncludes(includePayments = true) {
  const includes = [
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

  if (includePayments) {
    includes.push({
      model: paymentModel,
      as: 'payments',
      attributes: ['id', 'amount', 'external_id', 'receipt_id', 'refund_id', 'created_at', 'updated_at', 'payment_status']
    })
  }

  return includes
}

async function findBookingById(id, includePayments = true) {
  return bookingModel.findOne({
    where: { id },
    include: getBookingIncludes(includePayments)
  })
}

class BookingController {
  async create(req, res) {
    try {
      const { workspace_id, start_date, end_date, booking_status } = req.body
      const user_id = req.user.role_id === 1 ? req.body.user_id || req.user.id : req.user.id

      if (!workspace_id || !start_date || !end_date) {
        return res.status(400).json({ message: 'Заполните все обязательные поля' })
      }

      if (new Date(start_date) >= new Date(end_date)) {
        return res.status(400).json({ message: 'Дата начала должна быть раньше даты окончания' })
      }

      const workspace = await workspaceModel.findOne({ where: { id: workspace_id } })
      if (!workspace) {
        return res.status(404).json({ message: 'Рабочее место не найдено' })
      }
      if (!workspace.is_available) {
        return res.status(400).json({ message: 'Рабочее место недоступно' })
      }

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

      const currentPrice = await priceModel.findOne({
        where: { work_type_id: workspace.work_type_id },
        order: [['effective_from', 'DESC']]
      })

      if (!currentPrice) {
        return res.status(400).json({ message: 'Цена для данного типа рабочего места не установлена' })
      }

      const days = Math.ceil((new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24))
      const pricePerDay = parseFloat(currentPrice.price_day)
      const totalPrice = pricePerDay * days
      const booking = await bookingModel.create({
        user_id,
        workspace_id,
        start_date,
        end_date,
        price_per_day: pricePerDay,
        total_price: totalPrice,
        booking_status: booking_status || 'pending'
      })

      const createdBooking = await findBookingById(booking.id, false)

      runInBackground(async () => {
        const bookingDetails = {
          workspaceName: createdBooking.workspace.workspace_name,
          workType: createdBooking.workspace.work_type.type_name,
          startDate: new Date(start_date).toLocaleDateString('ru-RU'),
          endDate: new Date(end_date).toLocaleDateString('ru-RU'),
          totalPrice,
          status: createdBooking.booking_status
        }

        const emailHtml = getBookingCreatedTemplate(
          `${createdBooking.user.full_name} ${createdBooking.user.second_name}`,
          bookingDetails
        )

        const emailResult = await sendEmail(createdBooking.user.email, 'Бронирование создано', emailHtml)
        if (!emailResult.success) {
          console.warn(`⚠️  Failed to send booking created email to ${createdBooking.user.email}: ${emailResult.error}`)
        }
      }, 'booking-created-email')

      return res.status(201).json(createdBooking)
    } catch (error) {
      if (error.message.includes('Статус')) {
        return res.status(400).json({ message: error.message })
      }
      return res.status(500).json({ message: 'Ошибка сервера', error: error.message })
    }
  }

  async get(req, res) {
    try {
      const where = {}
      if (req.user.role_id !== 1) {
        where.user_id = req.user.id
      }

      const bookings = await bookingModel.findAll({
        where,
        include: getBookingIncludes(),
        order: [['id', 'DESC'], [{ model: paymentModel, as: 'payments' }, 'created_at', 'DESC']]
      })

      return res.json(bookings)
    } catch (error) {
      return res.status(500).json({ message: 'Ошибка сервера', error: error.message })
    }
  }

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

      await bookingModel.update(updateData, { where: { id } })
      const updatedBooking = await findBookingById(id)
      return res.json(updatedBooking)
    } catch (error) {
      if (error.message.includes('Статус')) {
        return res.status(400).json({ message: error.message })
      }
      return res.status(500).json({ message: 'Ошибка сервера', error: error.message })
    }
  }

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

      let cancelMessage = 'Бронирование отменено'

      if (payment && payment.external_id) {
        try {
          const paymentData = await getYooPayment(payment.external_id)
          if (['pending', 'waiting_for_capture'].includes(paymentData.status)) {
            await cancelYooPayment(paymentData.id)
            await payment.update({ payment_status: 'canceled' })
            cancelMessage = 'Бронирование отменено, платёж отменён'
          } else if (paymentData.status === 'succeeded') {
            const refund = await createYooRefund({
              paymentId: paymentData.id,
              amount: payment.amount,
              description: `Возврат средств за бронирование #${booking.id}`
            })
            await payment.update({ payment_status: 'refunded', refund_id: refund.id })
            cancelMessage = 'Бронирование отменено, возврат средств инициирован'
          } else if (paymentData.status === 'refunded') {
            cancelMessage = 'Бронирование отменено, средства уже возвращены'
          } else if (paymentData.status === 'canceled') {
            cancelMessage = 'Бронирование отменено, платёж уже отменён'
          } else {
            return res.status(400).json({
              message: `Нельзя отменить бронирование для статуса платежа ${paymentData.status}`
            })
          }
        } catch (refundError) {
          console.error('Ошибка возврата средств при отмене бронирования:', refundError)
          return res.status(500).json({
            message: 'Не удалось выполнить отмену бронирования, потому что возврат средств завершился ошибкой',
            error: refundError.message
          })
        }
      }

      await bookingModel.update({ booking_status: 'cancelled' }, { where: { id } })
      const cancelledBooking = await findBookingById(id)
      return res.json({ message: cancelMessage, booking: cancelledBooking })
    } catch (error) {
      return res.status(500).json({ message: 'Ошибка сервера', error: error.message })
    }
  }

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

        const isBusy = busyRanges.some(range => slotStart < range.end && slotEnd > range.start)
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

  async confirmBooking(req, res) {
    try {
      const { id } = req.params
      const booking = await findBookingById(id, false)

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
          runInBackground(async () => {
            const emailHtml = getBookingConfirmedTemplate(
              `${booking.user.full_name} ${booking.user.second_name}`,
              {
                workspaceName: booking.workspace.workspace_name,
                workType: booking.workspace.work_type.type_name,
                startDate: new Date(booking.start_date).toLocaleDateString('ru-RU'),
                endDate: new Date(booking.end_date).toLocaleDateString('ru-RU'),
                totalPrice: booking.total_price
              }
            )
            const emailResult = await sendEmail(booking.user.email, 'Бронирование подтверждено', emailHtml)
            if (!emailResult.success) {
              console.warn(`⚠️  Failed to send booking confirmed email to ${booking.user.email}: ${emailResult.error}`)
            }
          }, 'booking-confirmed-email')
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
      if (error.message.includes('Статус')) {
        return res.status(400).json({ message: error.message })
      }
      return res.status(500).json({ message: 'Ошибка сервера', error: error.message })
    }
  }

  async sendBookingReminder(req, res) {
    try {
      const { id } = req.params
      const booking = await findBookingById(id, false)

      if (!booking) {
        return res.status(404).json({ message: 'Бронирование не найдено' })
      }

      const now = new Date()
      const startTime = new Date(booking.start_date)
      const hoursUntilStart = Math.round((startTime - now) / (1000 * 60 * 60))

      if (hoursUntilStart <= 0) {
        return res.status(400).json({ message: 'Бронирование уже началось или прошло' })
      }

      runInBackground(async () => {
        const bookingDetails = {
          workspaceName: booking.workspace.workspace_name,
          workType: booking.workspace.work_type.type_name,
          startDate: startTime.toLocaleString('ru-RU')
        }

        const emailHtml = getBookingReminderTemplate(
          `${booking.user.full_name} ${booking.user.second_name}`,
          bookingDetails,
          hoursUntilStart
        )

        const emailResult = await sendEmail(booking.user.email, 'Напоминание о бронировании', emailHtml)
        if (!emailResult.success) {
          console.warn(`⚠️  Failed to send reminder email to ${booking.user.email}: ${emailResult.error}`)
        }
      }, 'booking-reminder-email')

      return res.json({ message: 'Напоминание поставлено в очередь отправки' })
    } catch (error) {
      return res.status(500).json({ message: 'Ошибка сервера', error: error.message })
    }
  }

  async getOccupancyReport(req, res) {
    try {
      const { start_date, end_date } = req.query

      if (!start_date || !end_date) {
        return res.status(400).json({ message: 'Укажите start_date и end_date' })
      }

      const totalWorkspaces = await workspaceModel.count()

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
            attributes: [],
            include: [
              {
                model: workTypeModel,
                as: 'work_type',
                attributes: []
              }
            ]
          }
        ],
        attributes: [
          [Sequelize.col('workspace.work_type.id'), 'work_type_id'],
          [Sequelize.col('workspace.work_type.type_name'), 'type_name'],
          [Sequelize.fn('COUNT', Sequelize.col('booking.id')), 'booking_count']
        ],
        group: ['workspace.work_type.id', 'workspace.work_type.type_name'],
        order: [[Sequelize.literal('booking_count'), 'DESC']],
        raw: true
      })

      return res.json({
        popularWorkTypes: popularTypes.map(item => ({
          work_type_id: item.work_type_id,
          type_name: item.type_name,
          booking_count: Number(item.booking_count)
        })),
        period: start_date && end_date ? { start_date, end_date } : null
      })
    } catch (error) {
      console.error('Ошибка отчёта popular-work-types:', error)
      return res.status(500).json({ message: 'Ошибка сервера', error: error.message })
    }
  }

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
            attributes: []
          }
        ],
        attributes: [
          'user_id',
          [Sequelize.col('user.id'), 'user_id_ref'],
          [Sequelize.col('user.email'), 'user_email'],
          [Sequelize.col('user.full_name'), 'user_full_name'],
          [Sequelize.col('user.second_name'), 'user_second_name'],
          [Sequelize.fn('COUNT', Sequelize.col('booking.id')), 'booking_count'],
          [Sequelize.fn('SUM', Sequelize.col('total_price')), 'total_spent']
        ],
        group: ['booking.user_id', 'user.id', 'user.email', 'user.full_name', 'user.second_name'],
        order: [[Sequelize.literal('total_spent'), 'DESC']],
        raw: true
      })

      return res.json({
        userBookings: userBookings.map(item => ({
          user_id: item.user_id,
          user: {
            id: item.user_id_ref,
            email: item.user_email,
            full_name: item.user_full_name,
            second_name: item.user_second_name
          },
          booking_count: Number(item.booking_count),
          total_spent: parseFloat(item.total_spent)
        })),
        period: start_date && end_date ? { start_date, end_date } : null
      })
    } catch (error) {
      console.error('Ошибка отчёта user-bookings:', error)
      return res.status(500).json({ message: 'Ошибка сервера', error: error.message })
    }
  }
}

module.exports = BookingController
