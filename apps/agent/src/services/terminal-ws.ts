import { Elysia } from 'elysia'
import { verify } from '@pocketdev/shared/crypto'
import { getDevice, updateDeviceLastSeen } from '../db/index.ts'
import { createTerminalSession, type TerminalSession } from './terminal.ts'

// ─── Debug log ring buffer ──────────────────────────────
const MAX_DEBUG_ENTRIES = 100
const debugLog: Array<{ ts: string; msg: string }> = []

function dbg(msg: string) {
  debugLog.push({ ts: new Date().toISOString(), msg })
  if (debugLog.length > MAX_DEBUG_ENTRIES) debugLog.shift()
  console.log(msg)
}

export function getTerminalDebugLog() {
  return [...debugLog]
}

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
  if (!authHeader) {
    dbg('[terminal-ws] No auth header')
    return null
  }

  try {
    const token = authHeader.replace(/^PocketDev\s+/i, '')
    const { deviceId, timestamp, signature } = JSON.parse(
      Buffer.from(token, 'base64').toString(),
    ) as { deviceId: string; timestamp: number; signature: string }

    const timeDiff = Math.abs(Date.now() - timestamp)
    if (timeDiff > 30_000) {
      dbg(`[terminal-ws] Timestamp rejected: diff=${timeDiff}ms, deviceId=${deviceId}`)
      return null
    }

    const device = getDevice(deviceId)
    if (!device) {
      dbg(`[terminal-ws] Device not found: ${deviceId}`)
      return null
    }

    const message = new TextEncoder().encode(String(timestamp))
    const sigBytes = fromHex(signature)
    const pubKeyBytes = fromHex(device.publicKey)

    const valid = await verify(sigBytes, message, pubKeyBytes)
    if (!valid) {
      dbg(`[terminal-ws] Signature verification failed for device ${deviceId}`)
      return null
    }

    updateDeviceLastSeen(deviceId)
    dbg(`[terminal-ws] Authenticated device: ${deviceId}`)
    return deviceId
  } catch (err) {
    dbg(`[terminal-ws] Auth error: ${err}`)
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
      dbg(`[terminal-ws] Session started: ${sessionId}`)
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
        if (!session) {
          dbg('[terminal-ws] Message received but no session')
          return
        }

        switch (msg.type) {
          case 'terminal.input':
            if (msg.data) {
              dbg('[terminal-ws] input: ' + msg.data.slice(0, 80).replace(/\n/g, '\\n'))
              session.send(msg.data)
            }
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
        dbg(`[terminal-ws] Message error: ${err}`)
      }
    },
    close(ws) {
      const session = (ws as any)._session as TerminalSession | undefined
      if (session) {
        session.kill()
        dbg(`[terminal-ws] Session ended: ${session.id}`)
      }
    },
  })
