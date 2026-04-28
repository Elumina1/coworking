const cron = require('node-cron')
const bookingModel = require('../models/bookingModel')
const userModel = require('../models/userModel')
const workspaceModel = require('../models/workspaceModel')
const workTypeModel = require('../models/worktypeModels')
const { sendEmail, getBookingReminderTemplate } = require('./emailService')
const { Op } = require('sequelize')

// Функция для отправки напоминаний о предстоящих бронированиях
async function sendReminders() {
  try {
    console.log('Проверка предстоящих бронирований для напоминаний...')

    const now = new Date()
    const reminderTime = new Date(now.getTime() + 24 * 60 * 60 * 1000) // За 24 часа до начала

    // Находим бронирования, которые начинаются через 24 часа
    const upcomingBookings = await bookingModel.findAll({
      where: {
        booking_status: 'confirmed',
        start_date: {
          [Op.gte]: now,
          [Op.lte]: reminderTime
        }
      },
      include: [
        {
          model: userModel,
          as: 'user'
        },
        {
          model: workspaceModel,
          as: 'workspace',
          include: [
            {
              model: workTypeModel,
              as: 'work_type'
            }
          ]
        }
      ]
    })

    console.log(`Найдено ${upcomingBookings.length} бронирований для напоминания`)

    for (const booking of upcomingBookings) {
      try {
        const startTime = new Date(booking.start_date)
        const hoursUntilStart = Math.round((startTime - now) / (1000 * 60 * 60))

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

        await sendEmail(booking.user.email, 'Напоминание о бронировании', emailHtml)
        console.log(`Напоминание отправлено пользователю ${booking.user.email}`)
      } catch (emailError) {
        console.error(`Ошибка отправки напоминания пользователю ${booking.user.email}:`, emailError)
      }
    }
  } catch (error) {
    console.error('Ошибка в задаче отправки напоминаний:', error)
  }
}

// Функция для обновления статуса завершенных бронирований
async function updateCompletedBookings() {
  try {
    console.log('Обновление статуса завершенных бронирований...')

    const now = new Date()

    const result = await bookingModel.update(
      { booking_status: 'completed' },
      {
        where: {
          booking_status: 'confirmed',
          end_date: { [Op.lt]: now }
        }
      }
    )

    if (result[0] > 0) {
      console.log(`Обновлено ${result[0]} завершенных бронирований`)
    }
  } catch (error) {
    console.error('Ошибка обновления завершенных бронирований:', error)
  }
}

// Запуск фоновых задач
function startScheduler() {
  // Отправка напоминаний каждый час
  cron.schedule('0 * * * *', () => {
    console.log('Запуск задачи отправки напоминаний')
    sendReminders()
  })

  // Обновление статуса завершенных бронирований каждый час
  cron.schedule('30 * * * *', () => {
    console.log('Запуск задачи обновления завершенных бронирований')
    updateCompletedBookings()
  })

  console.log('Фоновые задачи уведомлений запущены')
}

module.exports = {
  startScheduler,
  sendReminders,
  updateCompletedBookings
}
