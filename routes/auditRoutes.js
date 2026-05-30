const { Router } = require('express')
const AuditController = require('../controllers/auditController')
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware')

const router = new Router()
const auditController = new AuditController()

router.get('/audit', authMiddleware, adminMiddleware, auditController.get)

module.exports = router
