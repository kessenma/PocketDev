import { useState, useRef, useCallback, useEffect } from 'react'
import { useConnectionStore } from '../stores/connection'
import { buildTerminalWsUrl } from '../services/api'
import { buildPocketDevAuthorizationHeader } from '../services/auth'
import { createReactNativeWebSocket } from '../services/websocket'
import { getSudoPassword, saveSudoPassword } from '../services/secure-storage'
import {
  createSecurePromptMatcher,
  type SecurePromptMatch,
  type SecurePromptSpec,
} from '../utils/secure-prompts'

/** sudo (agent sets SUDO_PROMPT on macOS) and xcodes' "macOS User Password:" both want the login password. */
const SUDO_PROMPTS: SecurePromptSpec[] = [
  { pattern: /\[sudo\] password for/, title: 'sudo password required', kind: 'password' },
  { pattern: /macOS User Password:/, title: 'sudo password required', kind: 'password' },
]

export type { SecurePromptSpec, SecurePromptMatch } from '../utils/secure-prompts'

export interface UseTerminalCommandOptions {
  /** Sent automatically when WebSocket connects */
  initialCommand?: string
  /** Regex patterns that indicate command failure in output */
  errorPatterns?: RegExp[]
  /** Keep WS open after terminal.exited — consumer calls disconnect() when done */
  persistent?: boolean
  /** Side-effect callback fired on every output chunk */
  onOutput?: (chunk: string, fullOutput: string) => void
  /**
   * Interactive prompts (passwords, verification codes) to answer through a
   * native entry sheet. Values are sent straight to the terminal and never stored.
   */
  securePrompts?: SecurePromptSpec[]
}

export interface UseTerminalCommandReturn {
  output: string
  hasError: boolean
  done: boolean
  connected: boolean
  showSudoPrompt: boolean
  /** Send a command (appends \n) */
  sendCommand: (command: string) => void
  /** Send raw input (no \n appended) */
  sendInput: (data: string) => void
  submitSudoPassword: (password: string, remember: boolean) => void
  cancelSudoPrompt: () => void
  /** The secure prompt currently waiting for input (see `securePrompts`) */
  securePrompt: SecurePromptMatch | null
  /** Send the value + newline to the terminal; nothing is stored */
  submitSecurePrompt: (value: string) => void
  /** Dismiss the prompt and interrupt the running command (Ctrl-C) */
  cancelSecurePrompt: () => void
  /** Clear output + error state for retry flows */
  reset: () => void
  /** Explicitly close the WebSocket */
  disconnect: () => void
}

export function useTerminalCommand(
  options: UseTerminalCommandOptions = {},
): UseTerminalCommandReturn {
  const { initialCommand, errorPatterns = [], persistent = false, onOutput, securePrompts } = options
  const server = useConnectionStore((s) => s.server)

  // Latest prompt specs (they may depend on props, e.g. a prefilled email)
  const securePromptsRef = useRef<SecurePromptSpec[]>(securePrompts ?? [])
  securePromptsRef.current = securePrompts ?? []
  const promptMatcherRef = useRef(createSecurePromptMatcher(() => securePromptsRef.current))
  const sudoMatcherRef = useRef(createSecurePromptMatcher(SUDO_PROMPTS))

  const [output, setOutput] = useState('')
  const [hasError, setHasError] = useState(false)
  const [done, setDone] = useState(false)
  const [connected, setConnected] = useState(false)
  const [showSudoPrompt, setShowSudoPrompt] = useState(false)
  const [securePrompt, setSecurePrompt] = useState<SecurePromptMatch | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const outputRef = useRef('')
  const sessionIdRef = useRef<string | null>(null)
  const readyRef = useRef(false)

  // ── Sudo handling ─────────────────────────────────────────────

  const handleSudoNeeded = useCallback(async () => {
    if (!server) return
    // A Keychain failure must not swallow the prompt — fall back to asking.
    const stored = await getSudoPassword(server.ip).catch(() => null)
    if (stored && wsRef.current && readyRef.current && sessionIdRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'terminal.input', sessionId: sessionIdRef.current, data: stored + '\n' }))
      return
    }
    setShowSudoPrompt(true)
  }, [server])

  const submitSudoPassword = useCallback(
    (password: string, remember: boolean) => {
      setShowSudoPrompt(false)
      if (wsRef.current && readyRef.current && sessionIdRef.current) {
        wsRef.current.send(JSON.stringify({ type: 'terminal.input', sessionId: sessionIdRef.current, data: password + '\n' }))
      }
      if (remember && server) saveSudoPassword(server.ip, password)
    },
    [server],
  )

  const cancelSudoPrompt = useCallback(() => setShowSudoPrompt(false), [])

  // ── Secure prompts ────────────────────────────────────────────

  const submitSecurePrompt = useCallback((value: string) => {
    setSecurePrompt(null)
    if (wsRef.current && readyRef.current && sessionIdRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'terminal.input', sessionId: sessionIdRef.current, data: value + '\n' }))
    }
  }, [])

  const cancelSecurePrompt = useCallback(() => {
    setSecurePrompt(null)
    if (wsRef.current && readyRef.current && sessionIdRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'terminal.input', sessionId: sessionIdRef.current, data: '\x03' }))
    }
  }, [])

  // ── Send helpers ──────────────────────────────────────────────

  const sendCommand = useCallback((cmd: string) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN || !readyRef.current || !sessionIdRef.current) {
      console.warn('[useTerminalCommand] sendCommand called before terminal ready. readyState:', ws?.readyState, 'cmd:', cmd.slice(0, 60))
      return
    }
    console.log('[useTerminalCommand] sendCommand:', cmd.slice(0, 80))
    ws.send(JSON.stringify({ type: 'terminal.input', sessionId: sessionIdRef.current, data: cmd + '\n' }))
  }, [])

  const sendInput = useCallback((data: string) => {
    if (wsRef.current && readyRef.current && sessionIdRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'terminal.input', sessionId: sessionIdRef.current, data }))
    }
  }, [])

  // ── Reset / disconnect ────────────────────────────────────────

  const reset = useCallback(() => {
    outputRef.current = ''
    setOutput('')
    setHasError(false)
    setDone(false)
    setSecurePrompt(null)
    promptMatcherRef.current.reset()
    sudoMatcherRef.current.reset()
  }, [])

  const disconnect = useCallback(() => {
    wsRef.current?.close()
    wsRef.current = null
    sessionIdRef.current = null
    readyRef.current = false
  }, [])

  // ── WebSocket lifecycle ───────────────────────────────────────

  useEffect(() => {
    if (!server) return
    let cancelled = false

    ;(async () => {
      const url = buildTerminalWsUrl(server.ip, server.port)
      const authHeader = await buildPocketDevAuthorizationHeader()
      const termWs = createReactNativeWebSocket(url, { Authorization: authHeader })
      if (cancelled) { termWs.close(); return }

      wsRef.current = termWs
      outputRef.current = ''
      promptMatcherRef.current.reset()
      sudoMatcherRef.current.reset()
      sessionIdRef.current = null
      readyRef.current = false
      setOutput('')
      setHasError(false)
      setDone(false)

      console.log('[useTerminalCommand] Creating WS to:', url)

      termWs.onopen = () => {
        console.log('[useTerminalCommand] WS opened')
      }

      termWs.onmessage = (event) => {
        let text: string
        try {
          const msg = JSON.parse(event.data as string)
          if (msg.type === 'terminal.ready') {
            sessionIdRef.current = typeof msg.sessionId === 'string' ? msg.sessionId : null
            readyRef.current = !!sessionIdRef.current
            setConnected(readyRef.current)
            if (readyRef.current && initialCommand) {
              console.log('[useTerminalCommand] Sending initialCommand:', initialCommand.slice(0, 80))
              termWs.send(JSON.stringify({ type: 'terminal.input', sessionId: sessionIdRef.current, data: initialCommand + '\n' }))
            }
            return
          }
          if (msg.type === 'terminal.output') text = msg.data
          else if (msg.type === 'terminal.exited') {
            console.log('[useTerminalCommand] terminal.exited, code:', msg.exitCode)
            text = `\n[exited: ${msg.exitCode}]\n`
          }
          else return
        } catch { text = event.data as string }

        // Sudo detection (rolling buffer, so prompts split across chunks are caught)
        if (sudoMatcherRef.current.push(text)) handleSudoNeeded()

        // Secure prompts (Apple Account password, verification codes, …)
        const prompt = promptMatcherRef.current.push(text)
        if (prompt) setSecurePrompt(prompt)

        // Accumulate output
        outputRef.current += text
        setOutput(outputRef.current)

        // Error pattern checking
        for (const p of errorPatterns) {
          if (p.test(text)) { setHasError(true); break }
        }

        // Consumer callback
        onOutput?.(text, outputRef.current)
      }

      termWs.onerror = (err) => {
        console.warn('[useTerminalCommand] WS error:', err)
      }

      termWs.onclose = (ev) => {
        console.log('[useTerminalCommand] WS closed, code:', ev?.code, 'reason:', ev?.reason)
        wsRef.current = null
        sessionIdRef.current = null
        readyRef.current = false
        setConnected(false)
        if (!persistent) setDone(true)
      }
    })()

    return () => {
      cancelled = true
      wsRef.current?.close()
      wsRef.current = null
      sessionIdRef.current = null
      readyRef.current = false
    }
  }, [server]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    output,
    hasError,
    done,
    connected,
    showSudoPrompt,
    sendCommand,
    sendInput,
    submitSudoPassword,
    cancelSudoPrompt,
    securePrompt,
    submitSecurePrompt,
    cancelSecurePrompt,
    reset,
    disconnect,
  }
}
