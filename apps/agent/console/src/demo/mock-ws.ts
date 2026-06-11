// Replaces window.WebSocket so the Server Terminal works without an agent.
// For the terminal endpoint it plays a scripted session and echoes typed input
// through a tiny fake shell. Any other WebSocket URL delegates to the real one.

const TERMINAL_PATH = '/ws/console/terminal'
const PROMPT = '\x1b[1;36mdev@acme-web\x1b[0m:\x1b[1;34m~/acme-web\x1b[0m$ '

const BANNER = [
  '\x1b[1;33mPocketDev Server Terminal\x1b[0m \x1b[90m— interactive demo\x1b[0m',
  '\x1b[90mSandboxed shell. Try: \x1b[0mls\x1b[90m, \x1b[0mpwd\x1b[90m, \x1b[0mwhoami\x1b[90m, \x1b[0mhelp\x1b[90m.\x1b[0m',
  '',
].join('\r\n')

function runCommand(cmd: string): string {
  switch (cmd.trim()) {
    case '':
      return ''
    case 'ls':
      return 'public  src  package.json  README.md  tsconfig.json'
    case 'pwd':
      return '/home/dev/acme-web'
    case 'whoami':
      return 'dev'
    case 'help':
      return 'Available demo commands: ls, pwd, whoami, clear, help'
    case 'clear':
      return '\x1b[2J\x1b[H'
    default:
      return `\x1b[31m${cmd.trim()}: command not found\x1b[0m`
  }
}

class MockTerminalSocket {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSING = 2
  static readonly CLOSED = 3

  readyState = MockTerminalSocket.CONNECTING
  onopen: ((ev: Event) => void) | null = null
  onmessage: ((ev: MessageEvent) => void) | null = null
  onclose: ((ev: CloseEvent) => void) | null = null
  onerror: ((ev: Event) => void) | null = null

  private sessionId = 'demo-session'
  private lineBuf = ''

  constructor() {
    setTimeout(() => {
      this.readyState = MockTerminalSocket.OPEN
      this.onopen?.(new Event('open'))
      this.emit({ type: 'terminal.ready', sessionId: this.sessionId })
      this.output(BANNER + '\r\n' + PROMPT)
    }, 80)
  }

  private emit(msg: unknown) {
    this.onmessage?.({ data: JSON.stringify(msg) } as MessageEvent)
  }

  private output(data: string) {
    this.emit({ type: 'terminal.output', data })
  }

  send(raw: string) {
    let msg: { type?: string; data?: string }
    try {
      msg = JSON.parse(raw)
    } catch {
      return
    }
    if (msg.type !== 'terminal.input' || typeof msg.data !== 'string') return

    for (const ch of msg.data) {
      if (ch === '\r' || ch === '\n') {
        const result = runCommand(this.lineBuf)
        this.lineBuf = ''
        this.output('\r\n' + (result ? result + '\r\n' : '') + PROMPT)
      } else if (ch === '\x7f') {
        if (this.lineBuf.length > 0) {
          this.lineBuf = this.lineBuf.slice(0, -1)
          this.output('\b \b')
        }
      } else {
        this.lineBuf += ch
        this.output(ch)
      }
    }
  }

  close() {
    this.readyState = MockTerminalSocket.CLOSED
    this.onclose?.(new CloseEvent('close'))
  }
}

let installed = false

export function installMockWebSocket(): void {
  if (installed) return
  installed = true

  const RealWebSocket = window.WebSocket

  function WebSocketProxy(this: unknown, url: string | URL, protocols?: string | string[]) {
    const href = typeof url === 'string' ? url : url.href
    if (href.includes(TERMINAL_PATH)) {
      return new MockTerminalSocket()
    }
    return new RealWebSocket(url, protocols)
  }

  // Preserve the static readyState constants other code may read off the global.
  WebSocketProxy.CONNECTING = RealWebSocket.CONNECTING
  WebSocketProxy.OPEN = RealWebSocket.OPEN
  WebSocketProxy.CLOSING = RealWebSocket.CLOSING
  WebSocketProxy.CLOSED = RealWebSocket.CLOSED

  window.WebSocket = WebSocketProxy as unknown as typeof WebSocket
}
