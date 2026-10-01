// Minimal app: one page that sends "Permissions-Policy: unload=()" and a login form whose submit
// navigates via a slow server-side redirect (like a CAS login followed by a ticket validation).
const http = require('http')

const page = (title, body) => `<!doctype html><html><head><title>${title}</title></head><body>${body}</body></html>`

const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost')
    switch (url.pathname) {
        case '/app':
            res.writeHead(200, {'Content-Type': 'text/html', 'Permissions-Policy': 'unload=()'})
            return res.end(page('app', '<h1>App with Permissions-Policy: unload=()</h1>'))
        case '/plain':
            res.writeHead(200, {'Content-Type': 'text/html'})
            return res.end(page('plain', '<h1>App without Permissions-Policy</h1>'))
        case '/login':
            res.writeHead(200, {'Content-Type': 'text/html'})
            return res.end(page('login', '<form method="post" action="/submit"><input name="user"><button type="submit">Login</button></form>'))
        case '/submit':
            // slow response before redirecting, so the navigation is still pending right after the click
            return setTimeout(() => {
                res.writeHead(302, {Location: '/done'})
                res.end()
            }, 1000)
        case '/done':
            res.writeHead(200, {'Content-Type': 'text/html'})
            return res.end(page('done', '<h1 id="done">Logged in</h1>'))
        default:
            res.writeHead(404)
            return res.end()
    }
})

module.exports = (port) => new Promise((resolve) => server.listen(port, resolve))
