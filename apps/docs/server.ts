import path from 'node:path'
import fs from 'node:fs'

const PORT = Number(process.env.PORT ?? 2222)
const DIST_DIR = path.resolve(import.meta.dir, 'dist')
const CLIENT_DIR = path.join(DIST_DIR, 'client')
const SERVER_ENTRY = path.join(DIST_DIR, 'server', 'server.js')

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
}

async function start() {
  const serverModule = (await import(SERVER_ENTRY)) as {
    default: { fetch: (req: Request) => Response | Promise<Response> }
  }
  const handler = serverModule.default

  Bun.serve({
    port: PORT,
    hostname: '0.0.0.0',
    async fetch(req) {
      const url = new URL(req.url)

      // Try serving static files from client dist
      if (url.pathname !== '/' && !url.pathname.startsWith('/_server')) {
        const filePath = path.join(CLIENT_DIR, url.pathname)
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath)
          const headers: Record<string, string> = {}
          if (MIME_TYPES[ext]) headers['Content-Type'] = MIME_TYPES[ext]
          if (url.pathname.startsWith('/assets/')) {
            headers['Cache-Control'] = 'public, max-age=31536000, immutable'
          } else {
            headers['Cache-Control'] = 'public, max-age=3600'
          }
          return new Response(Bun.file(filePath), { headers })
        }
      }

      // Fall through to TanStack Start SSR handler
      return handler.fetch(req)
    },
  })

  console.log(`Docs server listening on http://localhost:${PORT}`)
}

start()
