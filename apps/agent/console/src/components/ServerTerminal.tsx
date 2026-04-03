import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import { Terminal as TerminalIcon, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'

type ConnectionState = 'disconnected' | 'connecting' | 'connected'

interface ServerTerminalProps {
  className?: string
  heightClassName?: string
  defaultOpen?: boolean
  hideHeader?: boolean
}

export function ServerTerminal({ className, heightClassName, defaultOpen = false, hideHeader = false }: ServerTerminalProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [connState, setConnState] = useState<ConnectionState>('disconnected')

  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const observerRef = useRef<ResizeObserver | null>(null)

  const focusTerminal = useCallback(() => {
    termRef.current?.focus()
  }, [])

  const cleanup = useCallback(() => {
    if (pingRef.current) {
      clearInterval(pingRef.current)
      pingRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.close()
      wsRef.current = null
    }
    sessionIdRef.current = null
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }
    if (termRef.current) {
      termRef.current.dispose()
      termRef.current = null
    }
    fitAddonRef.current = null
    setConnState('disconnected')
  }, [])

  const connect = useCallback(() => {
    if (!containerRef.current) return

    // Clean up any previous session
    cleanup()

    const term = new Terminal({
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: 14,
      cursorBlink: true,
      convertEol: true,
      theme: {
        background: '#0a0a0a',
        foreground: '#e4e4e7',
        cursor: '#a1a1aa',
        selectionBackground: '#27272a',
      },
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.loadAddon(new WebLinksAddon())

    termRef.current = term
    fitAddonRef.current = fitAddon

    term.open(containerRef.current)

    // Fit after a frame so the container has layout
    requestAnimationFrame(() => {
      fitAddon.fit()
      term.focus()
    })

    // WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/PocketDev/ws/console/terminal`

    setConnState('connecting')
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setConnState('connected')
      term.focus()
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as { type: string; data?: string; exitCode?: number; sessionId?: string }
        switch (msg.type) {
          case 'terminal.ready':
            sessionIdRef.current = msg.sessionId ?? null
            if (sessionIdRef.current) {
              ws.send(JSON.stringify({ type: 'terminal.resize', sessionId: sessionIdRef.current, cols: term.cols, rows: term.rows }))
            }
            break
          case 'terminal.output':
            if (msg.data) term.write(msg.data)
            break
          case 'terminal.exited':
            term.write(`\r\n\x1b[90m[Process exited with code ${msg.exitCode ?? 0}]\x1b[0m\r\n`)
            setConnState('disconnected')
            break
          case 'pong':
            break
        }
      } catch {
        // non-JSON message, write raw
        term.write(event.data)
      }
    }

    ws.onclose = () => {
      setConnState('disconnected')
      term.write('\r\n\x1b[90m[Disconnected]\x1b[0m\r\n')
    }

    ws.onerror = () => {
      setConnState('disconnected')
    }

    // User input -> server
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN && sessionIdRef.current) {
        ws.send(JSON.stringify({ type: 'terminal.input', sessionId: sessionIdRef.current, data }))
      }
    })

    // Resize handling
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit()
        if (wsRef.current?.readyState === WebSocket.OPEN && termRef.current) {
          wsRef.current.send(JSON.stringify({
            type: 'terminal.resize',
            sessionId: sessionIdRef.current,
            cols: termRef.current.cols,
            rows: termRef.current.rows,
          }))
        }
      }
    }

    const observer = new ResizeObserver(() => handleResize())
    observer.observe(containerRef.current)
    observerRef.current = observer

    // Keepalive ping
    pingRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN && sessionIdRef.current) {
        ws.send(JSON.stringify({ type: 'ping', sessionId: sessionIdRef.current }))
      }
    }, 30_000)
  }, [cleanup])

  // Connect when opened, cleanup when closed or unmounted
  useEffect(() => {
    if (isOpen) {
      // Small delay to let the container render
      const timer = setTimeout(connect, 50)
      return () => {
        clearTimeout(timer)
        cleanup()
      }
    } else {
      cleanup()
    }
  }, [isOpen, connect, cleanup])

  useEffect(() => {
    if (!isOpen || !containerRef.current) return

    const container = containerRef.current
    const handlePointerDown = () => {
      requestAnimationFrame(() => {
        focusTerminal()
      })
    }

    container.addEventListener('pointerdown', handlePointerDown)
    return () => container.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen, focusTerminal])

  return (
    <Card className={className}>
      {hideHeader ? null : (
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TerminalIcon className="h-5 w-5" />
              Server Terminal
            </CardTitle>
            <div className="flex items-center gap-2">
              {isOpen && connState === 'disconnected' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    connect()
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
              {isOpen && connState === 'connecting' && (
                <span className="text-xs text-muted-foreground">Connecting...</span>
              )}
              {isOpen && connState === 'connected' && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  Connected
                </span>
              )}
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CardHeader>
      )}
      {isOpen && (
        <CardContent>
          <div
            ref={containerRef}
            className={cn(
              'overflow-hidden rounded-md border border-border',
              heightClassName ?? 'h-[400px]',
            )}
            style={{ backgroundColor: '#0a0a0a' }}
            onClick={focusTerminal}
          />
        </CardContent>
      )}
    </Card>
  )
}
