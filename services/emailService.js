const nodemailer = require('nodemailer')
require('dotenv').config()

// Настройка транспорта для отправки email
const transporter = nodemailer.createTransporter({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false, // true для 465, false для других портов
  auth: {
    user: process.env.EMAIL_USER, // ваш email
    pass: process.env.EMAIL_PASS  // пароль приложения или пароль
  }
})

// Функция для отправки email
async function sendEmail(to, subject, html) {
  try {
    const mailOptions = {
      from: `"Coworking Service" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('Email sent:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, error: error.message }
  }
}

// Шаблоны email для различных событий

// Уведомление о создании бронирования
function getBookingCreatedTemplate(userName, bookingDetails) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Бронирование создано</h2>
      <p>Здравствуйте, ${userName}!</p>
      <p>Ваше бронирование успешно создано:</p>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Рабочее место:</strong> ${bookingDetails.workspaceName}</p>
        <p><strong>Тип:</strong> ${bookingDetails.workType}</p>
        <p><strong>Период:</strong> ${bookingDetails.startDate} - ${bookingDetails.endDate}</p>
        <p><strong>Стоимость:</strong> ${bookingDetails.totalPrice} руб.</p>
        <p><strong>Статус:</strong> ${bookingDetails.status}</p>
      </div>
      <p>Мы свяжемся с вами для подтверждения бронирования.</p>
      <p>С уважением,<br>Команда Coworking</p>
    </div>
  `
}

// Уведомление о подтверждении бронирования
function getBookingConfirmedTemplate(userName, bookingDetails) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #28a745;">Бронирование подтверждено</h2>
      <p>Здравствуйте, ${userName}!</p>
      <p>Ваше бронирование подтверждено:</p>
      <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Рабочее место:</strong> ${bookingDetails.workspaceName}</p>
        <p><strong>Тип:</strong> ${bookingDetails.workType}</p>
        <p><strong>Период:</strong> ${bookingDetails.startDate} - ${bookingDetails.endDate}</p>
        <p><strong>Стоимость:</strong> ${bookingDetails.totalPrice} руб.</p>
      </div>
      <p>Ждем вас в указанное время!</p>
      <p>С уважением,<br>Команда Coworking</p>
    </div>
  `
}

// Напоминание перед началом бронирования
function getBookingReminderTemplate(userName, bookingDetails, hoursUntilStart) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #ffc107;">Напоминание о бронировании</h2>
      <p>Здравствуйте, ${userName}!</p>
      <p>Напоминаем о вашем предстоящем бронировании:</p>
      <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Рабочее место:</strong> ${bookingDetails.workspaceName}</p>
        <p><strong>Тип:</strong> ${bookingDetails.workType}</p>
        <p><strong>Начало:</strong> ${bookingDetails.startDate}</p>
        <p><strong>Осталось:</strong> ${hoursUntilStart} часов</p>
      </div>
      <p>Не забудьте прибыть вовремя!</p>
      <p>С уважением,<br>Команда Coworking</p>
    </div>
  `
}

module.exports = {
  sendEmail,
  getBookingCreatedTemplate,
  getBookingConfirmedTemplate,
  getBookingReminderTemplate
}