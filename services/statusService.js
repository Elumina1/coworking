const bookingStatusModel = require('../models/bookingStatusModel')
const paymentStatusModel = require('../models/paymentStatusModel')
const notificationStatusModel = require('../models/notificationStatusModel')

const STATUS_CONFIG = {
  booking: {
    model: bookingStatusModel,
    relation: 'bookingStatus',
    codeField: 'booking_status'
  },
  payment: {
    model: paymentStatusModel,
    relation: 'paymentStatus',
    codeField: 'payment_status'
  },
  notification: {
    model: notificationStatusModel,
    relation: 'notificationStatus',
    codeField: 'status'
  }
}

const statusCache = {
  booking: new Map(),
  payment: new Map(),
  notification: new Map()
}

function getConfig(type) {
  const config = STATUS_CONFIG[type]
  if (!config) {
    throw new Error(`Неизвестный тип статуса: ${type}`)
  }
  return config
}

async function getStatusId(type, code) {
  const config = getConfig(type)
  const cache = statusCache[type]

  if (cache.has(code)) {
    return cache.get(code)
  }

  const status = await config.model.findOne({ where: { code } })
  if (!status) {
    throw new Error(`Статус "${code}" не найден для ${type}`)
  }

  cache.set(code, status.id)
  return status.id
}

async function getStatusIds(type, codes) {
  return Promise.all(codes.map(code => getStatusId(type, code)))
}

function serializeEntityStatus(type, entity) {
  if (!entity) {
    return entity
  }

  const { relation, codeField } = getConfig(type)
  const plain = typeof entity.get === 'function' ? entity.get({ plain: true }) : { ...entity }

  if (plain[relation]?.code) {
    plain[codeField] = plain[relation].code
  } else if (plain[codeField] === undefined) {
    plain[codeField] = null
  }

  return plain
}

function serializePayment(payment) {
  return serializeEntityStatus('payment', payment)
}

function serializeBooking(booking) {
  const plain = serializeEntityStatus('booking', booking)

  if (Array.isArray(plain?.payments)) {
    plain.payments = plain.payments.map(serializePayment)
  }

  return plain
}

function serializeNotification(notification) {
  return serializeEntityStatus('notification', notification)
}

module.exports = {
  getStatusId,
  getStatusIds,
  serializeBooking,
  serializePayment,
  serializeNotification
}
