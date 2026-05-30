const path = require('path')

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      return this
    }
  }
}

function mockModule(relativePath, exportsValue) {
  const modulePath = path.resolve(__dirname, '..', '..', relativePath)
  require.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports: exportsValue
  }
  return modulePath
}

function clearModules(relativePaths) {
  relativePaths.forEach((relativePath) => {
    const modulePath = path.resolve(__dirname, '..', '..', relativePath)
    delete require.cache[modulePath]
  })
}

module.exports = {
  createResponse,
  mockModule,
  clearModules
}
