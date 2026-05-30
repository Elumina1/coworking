const nodemailer = require('nodemailer')
require('dotenv').config()

function getEmailConfig() {
  const port = Number(process.env.EMAIL_PORT) || 465

  const host = process.env.EMAIL_HOST || 'smtp.yandex.ru'

  return {
    host,
    port,
    secure: port === 465, // Яндекс = SSL на 465
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    fromName: process.env.EMAIL_FROM_NAME || 'Coworking Service'
  }
}

function validateEmailConfig(config) {
  const missing = []

  if (!config.host) missing.push('EMAIL_HOST')
  if (!config.user) missing.push('EMAIL_USER')
  if (!config.pass) missing.push('EMAIL_PASS')

  return {
    valid: missing.length === 0,
    missing
  }
}

let transporter = null

async function getTransporter() {
  if (transporter) return transporter

  const config = getEmailConfig()
  const validation = validateEmailConfig(config)

  if (!validation.valid) {
    throw new Error(`Missing SMTP config: ${validation.missing.join(', ')}`)
  }

  console.log('📮 SMTP CONFIG:', config)

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,

    auth: {
      user: config.user,
      pass: config.pass
    },

    // 🔥 ВАЖНО: НЕ ломаем TLS
    tls: {
      rejectUnauthorized: false
    },

    // ❌ УБРАЛИ family:4 (он часто ломает IPv6/IPv4 routing)
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000
  })

  // проверка соединения
  await transporter.verify()
  console.log('✅ SMTP connected successfully')

  return transporter
}

async function sendEmail(to, subject, html, retries = 2) {
  const config = getEmailConfig()
  let lastError = null

  for (let i = 1; i <= retries + 1; i++) {
    try {
      const t = await getTransporter()

      const info = await t.sendMail({
        from: `"${config.fromName}" <${config.user}>`,
        to,
        subject,
        html
      })

      console.log(`✅ Email sent to ${to}: ${info.messageId}`)
      return { success: true, messageId: info.messageId }

    } catch (err) {
      lastError = err
      console.error(`❌ Email failed (${i}/${retries + 1}): ${err.message}`)

      await new Promise(r => setTimeout(r, 1500))
    }
  }

  return {
    success: false,
    error: lastError?.message || 'Unknown SMTP error'
  }
}

// ===== HTML TEMPLATES (оставлены без изменений) =====

function getBookingCreatedTemplate(userName, bookingDetails) {
  return `
    <div>
      <h2>Бронирование создано</h2>
      <p>Здравствуйте, ${userName}!</p>
      <p>Рабочее место: ${bookingDetails.workspaceName}</p>
      <p>Период: ${bookingDetails.startDate} - ${bookingDetails.endDate}</p>
      <p>Сумма: ${bookingDetails.totalPrice} руб.</p>
    </div>
  `
}

function getBookingConfirmedTemplate(userName, bookingDetails) {
  return `
    <div>
      <h2>Бронирование подтверждено</h2>
      <p>Здравствуйте, ${userName}!</p>
      <p>Рабочее место: ${bookingDetails.workspaceName}</p>
      <p>Период: ${bookingDetails.startDate} - ${bookingDetails.endDate}</p>
    </div>
  `
}

function getBookingReminderTemplate(userName, bookingDetails, hours) {
  return `
    <div>
      <h2>Напоминание</h2>
      <p>${userName}, осталось ${hours} часов</p>
      <p>${bookingDetails.workspaceName}</p>
    </div>
  `
}

function getPaymentSucceededTemplate(userName, bookingDetails) {
  return `
    <div>
      <h2>Оплата прошла успешно</h2>
      <p>${userName}</p>
      <p>Сумма: ${bookingDetails.totalPrice}</p>
    </div>
  `
}

function buildReceiptAttachment({ booking }) {
  return {
    filename: `receipt-${booking.id}.txt`,
    content: `Booking ${booking.id}`,
    contentType: 'text/plain'
  }
}

module.exports = {
  sendEmail,
  getBookingCreatedTemplate,
  getBookingConfirmedTemplate,
  getBookingReminderTemplate,
  getPaymentSucceededTemplate,
  buildReceiptAttachment
}