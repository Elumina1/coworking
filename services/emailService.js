const nodemailer = require('nodemailer')
require('dotenv').config()
require('dotenv').config({ path: '.env.example', override: false })

function getEmailConfig() {
  const port = Number(process.env.EMAIL_PORT) || 587

  return {
    host: process.env.EMAIL_HOST || null,
    port,
    secure: String(process.env.EMAIL_SECURE || '').toLowerCase() === 'true' || port === 465,
    service: process.env.EMAIL_SERVICE || null,
    user: process.env.EMAIL_USER || null,
    pass: process.env.EMAIL_PASS || null,
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

let transporterPromise = null

function buildTransportStrategies(config) {
  const strategies = []

  if (config.service) {
    strategies.push({
      label: `service:${config.service}`,
      options: {
        service: config.service,
        auth: {
          user: config.user,
          pass: config.pass
        },
        connectionTimeout: 20000,
        greetingTimeout: 20000,
        socketTimeout: 25000,
        family: 4,
        tls: {
          rejectUnauthorized: false
        }
      }
    })
  }

  const isGmailHost = config.host && config.host.includes('gmail')

  if (isGmailHost) {
    strategies.push({
      label: 'gmail-ssl-465',
      options: {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: config.user,
          pass: config.pass
        },
        connectionTimeout: 20000,
        greetingTimeout: 20000,
        socketTimeout: 25000,
        family: 4,
        tls: {
          rejectUnauthorized: false
        }
      }
    })

    strategies.push({
      label: 'gmail-starttls-587',
      options: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
          user: config.user,
          pass: config.pass
        },
        connectionTimeout: 20000,
        greetingTimeout: 20000,
        socketTimeout: 25000,
        family: 4,
        tls: {
          rejectUnauthorized: false
        }
      }
    })
  }

  strategies.push({
    label: `custom-${config.host}:${config.port}`,
    options: {
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass
      },
      connectionTimeout: 20000,
      greetingTimeout: 20000,
      socketTimeout: 25000,
      family: 4,
      tls: {
        rejectUnauthorized: false
      }
    }
  })

  return strategies
}

async function getTransporter() {
  if (transporterPromise) {
    return transporterPromise
  }

  transporterPromise = (async () => {
    const config = getEmailConfig()
    const validation = validateEmailConfig(config)

    if (!validation.valid) {
      throw new Error(`Не заданы SMTP-переменные: ${validation.missing.join(', ')}`)
    }
    const strategies = buildTransportStrategies(config)
    const errors = []

    for (const strategy of strategies) {
      try {
        console.log(`📨 Проверяем SMTP стратегию: ${strategy.label}`)
        const transporter = nodemailer.createTransport(strategy.options)
        await transporter.verify()
        console.log(`✓ Email transporter ready via ${strategy.label} as ${config.user}`)
        return transporter
      } catch (error) {
        errors.push(`${strategy.label}: ${error.message}`)
        console.error(`❌ SMTP strategy failed ${strategy.label}: ${error.message}`)
      }
    }

    throw new Error(`Не удалось подключиться к SMTP. Попытки: ${errors.join(' | ')}`)
  })().catch((error) => {
    transporterPromise = null
    throw error
  })

  return transporterPromise
}

async function sendEmail(to, subject, html, retries = 1) {
  if (!to || !subject || !html) {
    return { success: false, error: 'Missing email parameters' }
  }

  const config = getEmailConfig()
  let lastError = null

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const transporter = await getTransporter()
      const info = await transporter.sendMail({
        from: `"${config.fromName}" <${config.user}>`,
        to,
        subject,
        html
      })

      console.log(`✓ Email sent to ${to} - ${info.messageId}`)
      return { success: true, messageId: info.messageId }
    } catch (error) {
      lastError = error
      console.error(`❌ Email send failed to ${to} (attempt ${attempt}/${retries + 1}): ${error.message}`)

      if (attempt <= retries) {
        await new Promise(resolve => setTimeout(resolve, 1500))
      }
    }
  }

  return { success: false, error: lastError?.message || 'Unknown email error' }
}

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
