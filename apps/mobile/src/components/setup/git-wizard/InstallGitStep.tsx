import React, { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useConnectionStore } from '../../../stores/connection'
import { buildTerminalWsUrl } from '../../../services/api'
import { buildPocketDevAuthorizationHeader } from '../../../services/auth'
import { createReactNativeWebSocket } from '../../../services/websocket'
import { getSudoPassword, saveSudoPassword } from '../../../services/secure-storage'
import SudoPrompt from '../SudoPrompt'
import TerminalView, { type TerminalViewRef } from '../../shared/TerminalView'
import { CheckCircle, RefreshCw } from 'lucide-react-native'

const INSTALL_COMMAND = 'sudo apt-get update && sudo apt-get install -y git'
const SUDO_PROMPT_PATTERN = /\[sudo\] password for/
const ERROR_PATTERNS = [/^E: /m, /^error:/im, /^fatal:/im, /permission denied/im]

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'install' }
  | { type: 'STEP_FAILED'; step: 'install'; error: string }

interface Props {
  dispatch: (action: WizardAction) => void
}

export default function InstallGitStep({ dispatch }: Props) {
  const { colors } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const [output, setOutput] = useState('')
  const [hasError, setHasError] = useState(false)
  const [showSudoPrompt, setShowSudoPrompt] = useState(false)
  const [done, setDone] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const terminalRef = useRef<TerminalViewRef>(null)

  useEffect(() => {
    if (!server) return
    let cancelled = false

    ;(async () => {
      const url = buildTerminalWsUrl(server.ip, server.port)
      const authHeader = await buildPocketDevAuthorizationHeader()
      const termWs = createReactNativeWebSocket(url, { Authorization: authHeader })
      if (cancelled) { termWs.close(); return }

      wsRef.current = termWs
      sessionIdRef.current = null
      setOutput('')
      setHasError(false)

      termWs.onopen = () => {
        // Wait for terminal.ready before sending input.
      }

      termWs.onmessage = (event) => {
        let text: string
        try {
          const msg = JSON.parse(event.data as string)
          if (msg.type === 'terminal.ready') {
            sessionIdRef.current = typeof msg.sessionId === 'string' ? msg.sessionId : null
            if (sessionIdRef.current) {
              termWs.send(JSON.stringify({ type: 'terminal.input', sessionId: sessionIdRef.current, data: INSTALL_COMMAND + '\n' }))
            }
            return
          }
          if (msg.type === 'terminal.output') text = msg.data
          else if (msg.type === 'terminal.exited') text = `\n[Process exited: ${msg.exitCode}]\n`
          else return
        } catch { text = event.data as string }

        setOutput((prev) => {
          const updated = prev + text
          if (SUDO_PROMPT_PATTERN.test(text)) handleSudoNeeded()
          for (const p of ERROR_PATTERNS) {
            if (p.test(text)) { setHasError(true); break }
          }
          return updated
        })

        setTimeout(() => terminalRef.current?.scrollToEnd(), 50)
      }

      termWs.onclose = () => {
        wsRef.current = null
        sessionIdRef.current = null
        setDone(true)
      }
    })()

    return () => {
      cancelled = true
      wsRef.current?.close()
      wsRef.current = null
      sessionIdRef.current = null
    }
  }, [server])

  const handleSudoNeeded = useCallback(async () => {
    if (!server) return
    const stored = await getSudoPassword(server.ip)
    if (stored && wsRef.current && sessionIdRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'terminal.input', sessionId: sessionIdRef.current, data: stored + '\n' }))
      return
    }
    setShowSudoPrompt(true)
  }, [server])

  function handleSudoSubmit(password: string, remember: boolean) {
    setShowSudoPrompt(false)
    if (wsRef.current && sessionIdRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'terminal.input', sessionId: sessionIdRef.current, data: password + '\n' }))
    }
    if (remember && server) saveSudoPassword(server.ip, password)
  }

  function handleContinue() {
    dispatch({ type: 'STEP_COMPLETE', step: 'install' })
  }

  function handleRetry() {
    setHasError(false)
    setDone(false)
    setOutput('')
    if (wsRef.current && sessionIdRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'terminal.input', sessionId: sessionIdRef.current, data: INSTALL_COMMAND + '\n' }))
    }
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Install Git</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Installing git via apt package manager...
      </Text>

      <View style={styles.terminalWrapper}>
        <TerminalView ref={terminalRef} output={output} placeholder="Connecting..." />
      </View>

      {done && !hasError && (
        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: colors.primary }]}
          onPress={handleContinue}
          activeOpacity={0.7}
        >
          <CheckCircle color={colors.primaryText} size={18} strokeWidth={2.25} />
          <Text style={[styles.buttonText, { color: colors.primaryText }]}>Continue</Text>
        </TouchableOpacity>
      )}

      {hasError && (
        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: colors.error }]}
          onPress={handleRetry}
          activeOpacity={0.7}
        >
          <RefreshCw color="#fff" size={16} strokeWidth={2.25} />
          <Text style={[styles.buttonText, { color: '#fff' }]}>Retry</Text>
        </TouchableOpacity>
      )}

      <SudoPrompt
        visible={showSudoPrompt}
        onSubmit={handleSudoSubmit}
        onCancel={() => setShowSudoPrompt(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing[3],
  },
  title: {
    ...typographyScale.xl,
    fontWeight: '700',
  },
  subtitle: {
    ...typographyScale.sm,
  },
  terminalWrapper: {
    flex: 1,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
  },
  buttonText: {
    ...typographyScale.base,
    fontWeight: '600',
  },
})
