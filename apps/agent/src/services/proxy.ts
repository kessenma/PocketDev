import { Elysia } from 'elysia'

/** Default dev server port — can be overridden via env or auto-detected */
let devServerPort = Number(process.env.POCKETDEV_DEV_PORT ?? 5173)

/** Update the dev server port (called when auto-detected from task output) */
export function setDevServerPort(port: number) {
  devServerPort = port
  console.log(`Dev server port set to ${port}`)
}

export function getDevServerPort(): number {
  return devServerPort
}

/** Auto-detect dev server port from process output lines */
export function detectDevServerPort(line: string): number | null {
  // Match common dev server patterns:
  //   "Local: http://localhost:5173"
  //   "ready in 500ms. http://localhost:3000"
  //   "listening on port 8080"
  //   "Server running at http://localhost:4000"
  const patterns = [
    /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d+)/,
    /listening on (?:port )?(\d+)/i,
    /server (?:running|started) (?:at|on) .*?:(\d+)/i,
  ]

  for (const pattern of patterns) {
    const match = line.match(pattern)
    if (match) {
      const port = Number(match[1])
      if (port > 0 && port < 65536) return port
    }
  }
  return null
}

/** Elysia plugin that proxies /preview/* to localhost:devServerPort */
export const proxyRoutes = new Elysia()
  .all('/preview/*', async ({ request, set }) => {
    const url = new URL(request.url)
    // Strip /preview prefix
    const targetPath = url.pathname.replace(/^\/preview/, '') || '/'
    const targetUrl = `http://localhost:${devServerPort}${targetPath}${url.search}`

    try {
      const proxyReq = new Request(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: request.method !== 'GET' && request.method !== 'HEAD'
          ? request.body
          : undefined,
      })

      const resp = await fetch(proxyReq)

      // Copy response headers
      const headers: Record<string, string> = {}
      resp.headers.forEach((value, key) => {
        // Skip hop-by-hop headers
        if (!['transfer-encoding', 'connection'].includes(key.toLowerCase())) {
          headers[key] = value
        }
      })

      set.status = resp.status
      set.headers = headers
      return resp.body
    } catch {
      set.status = 502
      return { error: 'Dev server not reachable', port: devServerPort }
    }
  })
