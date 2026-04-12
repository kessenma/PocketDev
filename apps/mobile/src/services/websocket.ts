import type { WsMessage, CommandType } from '@pocketdev/shared/types'
import { buildPocketDevAuthorizationHeader } from './auth'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

type MessageHandler = (message: WsMessage) => void
type WebSocketFactory = (url: string, headers: Record<string, string>) => WebSocket

export function createReactNativeWebSocket(url: string, headers: Record<string, string>): WebSocket {
  return new WebSocket(url, undefined, { headers })
}

export class PocketDevWebSocket {
  private ws: WebSocket | null = null
  private url: string
  private onStatusChange: (status: ConnectionStatus) => void
  private onMessage: MessageHandler
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private shouldReconnect = true
  private createWebSocket: WebSocketFactory

  constructor(
    url: string,
    onStatusChange: (status: ConnectionStatus) => void,
    onMessage: MessageHandler,
    createWebSocket: WebSocketFactory = createReactNativeWebSocket,
  ) {
    this.url = url
    this.onStatusChange = onStatusChange
    this.onMessage = onMessage
    this.createWebSocket = createWebSocket
  }

  /** Suppress the automatic reconnect loop (e.g. when the server is locked) */
  suppressReconnect() {
    this.shouldReconnect = false
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  async connect() {
    this.shouldReconnect = true

    // Detach old raw WebSocket before creating a new one.
    // Without this, the old WS's onclose/onerror handlers fire asynchronously
    // and interfere with the new connection (clearing timers, setting status to
    // 'disconnected', scheduling redundant reconnects).
    if (this.ws) {
      this.ws.onopen = null
      this.ws.onclose = null
      this.ws.onmessage = null
      this.ws.onerror = null
      try { this.ws.close() } catch { /* already closed */ }
      this.ws = null
    }

    this.onStatusChange('connecting')

    try {
      const authHeader = await buildPocketDevAuthorizationHeader()
      this.ws = this.createWebSocket(this.url, {
        Authorization: authHeader,
      })

      this.ws.onopen = () => {
        this.reconnectAttempts = 0
        this.onStatusChange('connected')
        this.startPingInterval()
      }

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data as string) as WsMessage
          if (message.type === 'pong') return
          this.onMessage(message)
        } catch {
          // Ignore malformed messages
        }
      }

      this.ws.onclose = () => {
        this.cleanup()
        this.onStatusChange('disconnected')
        if (this.shouldReconnect) this.scheduleReconnect()
      }

      this.ws.onerror = () => {
        this.cleanup()
        this.onStatusChange('error')
        if (this.shouldReconnect) this.scheduleReconnect()
      }
    } catch {
      this.onStatusChange('error')
      if (this.shouldReconnect) this.scheduleReconnect()
    }
  }

  send<T>(type: CommandType, payload: T) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return

    const message: WsMessage<T> = {
      type,
      id: generateId(),
      payload,
      timestamp: Date.now(),
    }
    this.ws.send(JSON.stringify(message))
  }

  disconnect() {
    this.shouldReconnect = false
    this.cleanup()
    this.ws?.close()
    this.ws = null
    this.onStatusChange('disconnected')
  }

  private startPingInterval() {
    this.stopPingInterval()
    this.pingTimer = setInterval(() => {
      this.send('ping', {})
    }, 30_000)
  }

  private stopPingInterval() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.onStatusChange('error')
      return
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30_000)
    this.reconnectAttempts++

    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, delay)
  }

  private cleanup() {
    this.stopPingInterval()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}
