const test = require('node:test')
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const { createResponse, mockModule, clearModules } = require('./helpers/controllerTestUtils')

const controllerPath = 'controllers/authController.js'
const userModelPath = 'models/userModel.js'

function loadAuthController(userModel) {
  clearModules([controllerPath, userModelPath])
  mockModule(userModelPath, userModel)
  const AuthController = require('../controllers/authController')
  return new AuthController()
}

test('register creates user with hashed password and returns token', async () => {
  process.env.JWT_SECRET_KEY = 'test-secret'

  let createdPayload
  const userModel = {
    findOne: async () => null,
    create: async (payload) => {
      createdPayload = payload
      return {
        id: 42,
        ...payload
      }
    }
  }

  const controller = loadAuthController(userModel)
  const req = {
    body: {
      email: 'client@example.com',
      password: 'plain-password',
      full_name: 'Иван',
      second_name: 'Иванов'
    }
  }
  const res = createResponse()

  await controller.register(req, res)

  assert.equal(res.statusCode, 201)
  assert.equal(res.body.message, 'Регистрация успешна')
  assert.equal(res.body.user.email, 'client@example.com')
  assert.equal(res.body.user.role_id, 2)
  assert.notEqual(createdPayload.password, 'plain-password')
  assert.equal(await bcrypt.compare('plain-password', createdPayload.password), true)

  const decoded = jwt.verify(res.body.token, 'test-secret')
  assert.equal(decoded.id, 42)
  assert.equal(decoded.role_id, 2)
})

test('login returns token for correct credentials', async () => {
  process.env.JWT_SECRET_KEY = 'test-secret'
  const hashedPassword = await bcrypt.hash('correct-password', 10)
  const userModel = {
    findOne: async ({ where }) => {
      assert.deepEqual(where, { email: 'client@example.com' })
      return {
        id: 7,
        email: 'client@example.com',
        password: hashedPassword,
        full_name: 'Анна',
        second_name: 'Петрова',
        role_id: 2
      }
    }
  }

  const controller = loadAuthController(userModel)
  const req = {
    body: {
      email: 'client@example.com',
      password: 'correct-password'
    }
  }
  const res = createResponse()

  await controller.login(req, res)

  assert.equal(res.statusCode, 200)
  assert.equal(res.body.message, 'вход выполнен')
  assert.equal(res.body.user.email, 'client@example.com')

  const decoded = jwt.verify(res.body.token, 'test-secret')
  assert.equal(decoded.id, 7)
  assert.equal(decoded.role_id, 2)
})
