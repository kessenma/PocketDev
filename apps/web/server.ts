import path from 'node:path'
import fs from 'node:fs'
import { handleInstallScript } from './src/server/install-script'
import { handleVersionCheck, handleBundleDownload } from './src/server/agent-version'
import { handlePushProvision, handlePushRegisterDevice, handlePushSend } from './src/server/push'

const PORT = Number(process.env.PORT ?? 3000)
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
  '.webmanifest': 'application/manifest+json',
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

      // Push notification relay
      if (url.pathname === '/api/push/provision' && req.method === 'POST') {
        return handlePushProvision(req)
      }
      if (url.pathname === '/api/push/register-device' && req.method === 'POST') {
        return handlePushRegisterDevice(req)
      }
      if (url.pathname === '/api/push/send' && req.method === 'POST') {
        return handlePushSend(req)
      }

      // Serve install script and track downloads
      if (url.pathname === '/install.sh') {
        return handleInstallScript(req)
      }

      // Agent version check
      if (url.pathname === '/agent/version') {
        return handleVersionCheck()
      }

      // Serve agent bundle (latest or pinned version)
      if (url.pathname.startsWith('/agent/bundle')) {
        return handleBundleDownload(url.pathname)
      }

      // Try serving static files from client dist
      if (url.pathname !== '/' && !url.pathname.startsWith('/_server')) {
        const filePath = path.join(CLIENT_DIR, url.pathname)
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath)
          const headers: Record<string, string> = {}
          if (MIME_TYPES[ext]) headers['Content-Type'] = MIME_TYPES[ext]
          if (url.pathname.startsWith('/assets/') && !url.pathname.endsWith('.css')) {
            headers['Cache-Control'] = 'public, max-age=31536000, immutable'
          } else if (url.pathname.startsWith('/assets/') && url.pathname.endsWith('.css')) {
            headers['Cache-Control'] = 'public, max-age=86400'
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

  console.log(`Server listening on http://localhost:${PORT}`)
}

start()
