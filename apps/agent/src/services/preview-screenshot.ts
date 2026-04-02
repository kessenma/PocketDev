import { Elysia } from 'elysia'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readFile, unlink } from 'node:fs/promises'
import { getToolPath } from '../db/index.ts'
import { getDevServerPort } from './proxy.ts'

export const screenshotRoutes = new Elysia()
  .get('/preview/screenshot', async ({ query, set }) => {
    const chromiumPath = getToolPath('chromium')
    if (!chromiumPath) {
      set.status = 502
      return { error: 'Chromium not installed. Install it via the setup wizard.' }
    }

    const width = Number(query.width ?? 375)
    const height = Number(query.height ?? 812)
    const devPort = getDevServerPort()
    const outputPath = join(tmpdir(), `pocketdev-screenshot-${Date.now()}.png`)

    try {
      const proc = Bun.spawn([
        chromiumPath,
        '--headless',
        '--disable-gpu',
        '--no-sandbox',
        `--screenshot=${outputPath}`,
        `--window-size=${width},${height}`,
        `http://localhost:${devPort}`,
      ], {
        stdout: 'pipe',
        stderr: 'pipe',
      })

      await proc.exited

      if (proc.exitCode !== 0) {
        set.status = 502
        return { error: 'Screenshot capture failed', exitCode: proc.exitCode }
      }

      const png = await readFile(outputPath)

      // Clean up temp file
      unlink(outputPath).catch(() => {})

      set.headers['content-type'] = 'image/png'
      set.headers['cache-control'] = 'no-cache'
      return png
    } catch {
      set.status = 502
      return { error: 'Dev server not reachable', port: devPort }
    }
  })
