const fs = require('fs/promises')
const path = require('path')

const auditLogPath = path.resolve(__dirname, '..', 'logs', 'audit.log')

function toPlain(value) {
  if (!value) return null
  if (typeof value.get === 'function') return value.get({ plain: true })
  if (typeof value.toJSON === 'function') return value.toJSON()
  return value
}

function pickActor(user) {
  if (!user) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    role_id: user.role_id
  }
}

async function writeAuditLog({ req, entity, entityId, action, oldValue = null, newValue = null, metadata = {} }) {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    created_at: new Date().toISOString(),
    actor: pickActor(req?.user),
    action,
    entity,
    entity_id: entityId ? String(entityId) : null,
    old_value: toPlain(oldValue),
    new_value: toPlain(newValue),
    metadata
  }

  try {
    await fs.mkdir(path.dirname(auditLogPath), { recursive: true })
    await fs.appendFile(auditLogPath, `${JSON.stringify(entry)}\n`, 'utf8')
  } catch (error) {
    console.error('Ошибка записи аудита:', error.message)
  }
}

async function readAuditLogs(limit = 100) {
  try {
    const content = await fs.readFile(auditLogPath, 'utf8')
    return content
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .reverse()
      .slice(0, limit)
  } catch (error) {
    if (error.code === 'ENOENT') {
      return []
    }
    throw error
  }
}

module.exports = {
  writeAuditLog,
  readAuditLogs
}
