import { Elysia } from 'elysia'
import { verify } from '@pocketdev/shared/crypto'
import { getDevice, updateDeviceLastSeen } from '../db/index.ts'
import { createTerminalSession, type TerminalSession } from './terminal.ts'

/** Hex string to Uint8Array */
function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

/** Authenticate from auth header */
async function authenticate(authHeader: string | null): Promise<string | null> {
  if (process.env.POCKETDEV_DEV_MODE === '1') return 'dev-device'
  if (!authHeader) return null

  try {
    const token = authHeader.replace(/^PocketDev\s+/i, '')
    const { deviceId, timestamp, signature } = JSON.parse(
      Buffer.from(token, 'base64').toString(),
    ) as { deviceId: string; timestamp: number; signature: string }

    if (Math.abs(Date.now() - timestamp) > 30_000) return null

    const device = getDevice(deviceId)
    if (!device) return null

    const message = new TextEncoder().encode(String(timestamp))
    const sigBytes = fromHex(signature)
    const pubKeyBytes = fromHex(device.publicKey)

    const valid = await verify(sigBytes, message, pubKeyBytes)
    if (!valid) return null

    updateDeviceLastSeen(deviceId)
    return deviceId
  } catch {
    return null
  }
}

/** Elysia WebSocket plugin for interactive terminal */
export const terminalWsRoutes = new Elysia()
  .ws('/ws/terminal', {
    async beforeHandle({ request }) {
      const deviceId = await authenticate(request.headers.get('authorization'))
      if (!deviceId) {
        throw new Error('Unauthorized')
      }
    },
    open(ws) {
      const sessionId = crypto.randomUUID()
      ;(ws as any)._sessionId = sessionId

      const session = createTerminalSession(
        sessionId,
        (data) => {
          // Send raw terminal output
          ws.send(JSON.stringify({ type: 'terminal.output', data }))
        },
        (exitCode) => {
          ws.send(JSON.stringify({ type: 'terminal.exited', exitCode }))
          ws.close()
        },
      )

      ;(ws as any)._session = session
      console.log(`Terminal session started: ${sessionId}`)
    },
    message(ws, raw) {
      try {
        const msg = typeof raw === 'string' ? JSON.parse(raw) : raw as {
          type: string
          data?: string
          cols?: number
          rows?: number
        }
        const session = (ws as any)._session as TerminalSession | undefined
        if (!session) return

        switch (msg.type) {
          case 'terminal.input':
            if (msg.data) session.send(msg.data)
            break

          case 'terminal.resize':
            if (msg.cols && msg.rows) {
              session.resize(msg.cols, msg.rows)
            }
            break

          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }))
            break
        }
      } catch (err) {
        console.error('Terminal WS message error:', err)
      }
    },
    close(ws) {
      const session = (ws as any)._session as TerminalSession | undefined
      if (session) {
        session.kill()
        console.log(`Terminal session ended: ${session.id}`)
      }
    },
  })
