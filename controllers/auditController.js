const { readAuditLogs } = require('../services/auditService')

class AuditController {
  async get(req, res) {
    try {
      const limit = Number(req.query.limit) || 100
      const logs = await readAuditLogs(Math.min(Math.max(limit, 1), 500))
      return res.json({ logs })
    } catch (error) {
      return res.status(500).json({ message: 'Ошибка сервера', error: error.message })
    }
  }
}

module.exports = AuditController
