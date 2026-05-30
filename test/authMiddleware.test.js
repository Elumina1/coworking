const test = require('node:test')
const assert = require('node:assert/strict')
const { adminMiddleware } = require('../middleware/authMiddleware')
const { createResponse } = require('./helpers/controllerTestUtils')

test('adminMiddleware rejects regular user', () => {
  const req = {
    user: {
      id: 5,
      role_id: 2
    }
  }
  const res = createResponse()
  let nextCalled = false

  adminMiddleware(req, res, () => {
    nextCalled = true
  })

  assert.equal(nextCalled, false)
  assert.equal(res.statusCode, 403)
  assert.equal(res.body.message, 'Доступ только для администраторов')
})

test('adminMiddleware allows admin user', () => {
  const req = {
    user: {
      id: 1,
      role_id: 1
    }
  }
  const res = createResponse()
  let nextCalled = false

  adminMiddleware(req, res, () => {
    nextCalled = true
  })

  assert.equal(nextCalled, true)
  assert.equal(res.statusCode, 200)
  assert.equal(res.body, undefined)
})
