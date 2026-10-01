const {defineConfig} = require('cypress')
const startServer = require('./server')

const port = 3000
startServer(port)

module.exports = defineConfig({
    e2e: {
        baseUrl: `http://localhost:${port}`,
        supportFile: false,
        video: false,
    },
})
