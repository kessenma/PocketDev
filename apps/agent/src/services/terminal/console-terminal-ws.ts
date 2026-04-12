import { Elysia } from 'elysia'
import { validateSession } from '../auth/console-auth.ts'
import { createTerminalSession, type TerminalSession } from './terminal.ts'

/** Elysia WebSocket plugin for console terminal (cookie-authenticated) */
export const consoleTerminalWsRoutes = new Elysia()
  .ws('/ws/console/terminal', {
    async beforeHandle({ request }) {
      const valid = validateSession(request.headers.get('cookie'))
      if (!valid) {
        throw new Error('Unauthorized')
      }
    },
    open(ws) {
      const sessionId = crypto.randomUUID()
      const session = createTerminalSession(
        sessionId,
        (data) => {
          ws.send(JSON.stringify({ type: 'terminal.output', data }))
        },
        (exitCode) => {
          ws.send(JSON.stringify({ type: 'terminal.exited', exitCode }))
          ws.close()
        },
      )

      ;(ws.data as { sessionId?: string; session?: TerminalSession }).sessionId = sessionId
      ;(ws.data as { sessionId?: string; session?: TerminalSession }).session = session
      ws.send(JSON.stringify({ type: 'terminal.ready', sessionId }))
      console.log(`[console-terminal] Session started: ${sessionId}`)
    },
    message(ws, raw) {
      try {
        const msg = typeof raw === 'string' ? JSON.parse(raw) : raw as {
          type: string
          sessionId?: string
          data?: string
          cols?: number
          rows?: number
        }
        const wsData = ws.data as { sessionId?: string; session?: TerminalSession }
        const session = wsData.session
        if (!session) return
        if (msg.type !== 'ping' && msg.sessionId !== wsData.sessionId) return

        switch (msg.type) {
          case 'terminal.input':
            if (msg.data) session.send(msg.data)
            break
          case 'terminal.resize':
            if (msg.cols && msg.rows) session.resize(msg.cols, msg.rows)
            break
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }))
            break
        }
      } catch (err) {
        console.error(`[console-terminal] Message error: ${err}`)
      }
    },
    close(ws) {
      const session = (ws.data as { session?: TerminalSession }).session
      if (session) {
        session.kill()
        console.log(`[console-terminal] Session ended: ${session.id}`)
      }
    },
  })
