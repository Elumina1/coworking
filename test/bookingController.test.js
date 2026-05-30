const test = require('node:test')
const assert = require('node:assert/strict')
const { createResponse, mockModule, clearModules } = require('./helpers/controllerTestUtils')

const controllerPath = 'controllers/bookingController.js'
const modelPaths = [
  'models/bookingModel.js',
  'models/workspaceModel.js',
  'models/worktypeModels.js',
  'models/userModel.js',
  'models/priceModels.js',
  'models/paymentModel.js',
  'services/emailService.js',
  'services/yooCheckoutService.js',
  'services/auditService.js'
]

function makeBooking(overrides = {}) {
  return {
    id: 101,
    user_id: 5,
    workspace_id: 3,
    start_date: '2026-06-01',
    end_date: '2026-06-03',
    price_per_day: 1500,
    total_price: 3000,
    booking_status: 'pending',
    workspace: {
      id: 3,
      workspace_name: 'Open Space 3',
      work_type: {
        id: 2,
        type_name: 'Open Space'
      }
    },
    user: {
      id: 5,
      email: 'client@example.com',
      full_name: 'Иван',
      second_name: 'Иванов'
    },
    ...overrides
  }
}

function loadBookingController({ bookingModel, workspaceModel, priceModel, paymentModel }) {
  clearModules([controllerPath, ...modelPaths])
  mockModule('models/bookingModel.js', bookingModel)
  mockModule('models/workspaceModel.js', workspaceModel)
  mockModule('models/worktypeModels.js', {})
  mockModule('models/userModel.js', {})
  mockModule('models/priceModels.js', priceModel)
  mockModule('models/paymentModel.js', paymentModel || {})
  mockModule('services/emailService.js', {
    sendEmail: async () => ({ success: true, messageId: 'test-message' }),
    getBookingCreatedTemplate: () => '<p>created</p>',
    getBookingConfirmedTemplate: () => '<p>confirmed</p>',
    getBookingReminderTemplate: () => '<p>reminder</p>'
  })
  mockModule('services/yooCheckoutService.js', {
    createYooPayment: async () => ({}),
    getYooPayment: async () => ({}),
    createYooRefund: async () => ({}),
    cancelYooPayment: async () => ({})
  })
  mockModule('services/auditService.js', {
    writeAuditLog: async () => {}
  })

  const BookingController = require('../controllers/bookingController')
  return new BookingController()
}

test('create booking calculates price and creates pending booking', async () => {
  let createdPayload
  const createdBooking = makeBooking()
  const bookingModel = {
    findOne: async ({ where, include }) => {
      if (where?.id === 101 && include) {
        return createdBooking
      }
      return null
    },
    create: async (payload) => {
      createdPayload = payload
      return { id: 101 }
    }
  }
  const workspaceModel = {
    findOne: async ({ where }) => {
      assert.deepEqual(where, { id: 3 })
      return { id: 3, work_type_id: 2, is_available: true, workspace_name: 'Open Space 3' }
    }
  }
  const priceModel = {
    findOne: async ({ where }) => {
      assert.deepEqual(where, { work_type_id: 2 })
      return { price_day: '1500.00' }
    }
  }

  const controller = loadBookingController({ bookingModel, workspaceModel, priceModel })
  const req = {
    user: { id: 5, role_id: 2 },
    body: {
      workspace_id: 3,
      start_date: '2026-06-01',
      end_date: '2026-06-03'
    }
  }
  const res = createResponse()

  await controller.create(req, res)

  assert.equal(res.statusCode, 201)
  assert.equal(res.body.id, 101)
  assert.deepEqual(createdPayload, {
    user_id: 5,
    workspace_id: 3,
    start_date: '2026-06-01',
    end_date: '2026-06-03',
    price_per_day: 1500,
    total_price: 3000,
    booking_status: 'pending'
  })
})

test('create booking rejects overlapping dates', async () => {
  const bookingModel = {
    findOne: async ({ where }) => {
      if (where?.workspace_id === 3) {
        return makeBooking({ id: 88 })
      }
      return null
    },
    create: async () => {
      throw new Error('create should not be called')
    }
  }
  const workspaceModel = {
    findOne: async () => ({ id: 3, work_type_id: 2, is_available: true })
  }
  const priceModel = {
    findOne: async () => ({ price_day: '1500.00' })
  }

  const controller = loadBookingController({ bookingModel, workspaceModel, priceModel })
  const req = {
    user: { id: 5, role_id: 2 },
    body: {
      workspace_id: 3,
      start_date: '2026-06-01',
      end_date: '2026-06-03'
    }
  }
  const res = createResponse()

  await controller.create(req, res)

  assert.equal(res.statusCode, 400)
  assert.equal(res.body.message, 'Рабочее место уже забронировано на выбранные даты')
})

test('cancel booking rejects user that does not own booking', async () => {
  const bookingModel = {
    findOne: async () => makeBooking({ id: 101, user_id: 8 }),
    update: async () => {
      throw new Error('update should not be called')
    }
  }
  const workspaceModel = {
    findOne: async () => ({ id: 3, work_type_id: 2, is_available: true })
  }
  const priceModel = {
    findOne: async () => ({ price_day: '1500.00' })
  }

  const controller = loadBookingController({ bookingModel, workspaceModel, priceModel })
  const req = {
    user: { id: 5, role_id: 2 },
    params: { id: 101 }
  }
  const res = createResponse()

  await controller.cancel(req, res)

  assert.equal(res.statusCode, 403)
  assert.equal(res.body.message, 'Недостаточно прав для отмены этого бронирования')
})
