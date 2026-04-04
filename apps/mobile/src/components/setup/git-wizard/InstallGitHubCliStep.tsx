import React, { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useConnectionStore } from '../../../stores/connection'
import { buildTerminalWsUrl, fetchGitSshStatus } from '../../../services/api'
import { buildPocketDevAuthorizationHeader } from '../../../services/auth'
import { createReactNativeWebSocket } from '../../../services/websocket'
import { getSudoPassword, saveSudoPassword } from '../../../services/secure-storage'
import SudoPrompt from '../SudoPrompt'
import TerminalView, { type TerminalViewRef } from '../../shared/TerminalView'
import { CheckCircle, RefreshCw } from 'lucide-react-native'

const INSTALL_COMMAND = 'type gh >/dev/null 2>&1 || (curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg && sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null && sudo apt update && sudo apt install gh -y)'
const SUDO_PROMPT_PATTERN = /\[sudo\] password for/
const ERROR_PATTERNS = [/^E: /m, /^error:/im, /^fatal:/im, /permission denied/im]
const SHELL_PROMPT_PATTERN = /(?:^|\n)[^\n]*[@:][^\n]*[#$]\s*$/m

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'install-gh' }
  | { type: 'STEP_FAILED'; step: 'install-gh'; error: string }

interface Props {
  dispatch: (action: WizardAction) => void
}

export default function InstallGitHubCliStep({ dispatch }: Props) {
  const { colors } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const [output, setOutput] = useState('')
  const [hasError, setHasError] = useState(false)
  const [showSudoPrompt, setShowSudoPrompt] = useState(false)
  const [done, setDone] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const terminalRef = useRef<TerminalViewRef>(null)
  const commandStartedRef = useRef(false)
  const verifyingRef = useRef(false)

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
      setDone(false)
      commandStartedRef.current = false
      verifyingRef.current = false

      termWs.onmessage = (event) => {
        let text: string
        try {
          const msg = JSON.parse(event.data as string)
          if (msg.type === 'terminal.ready') {
            sessionIdRef.current = typeof msg.sessionId === 'string' ? msg.sessionId : null
            if (sessionIdRef.current) {
              commandStartedRef.current = true
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
          if (
            SHELL_PROMPT_PATTERN.test(updated) &&
            commandStartedRef.current &&
            !verifyingRef.current
          ) {
            verifyingRef.current = true
            verifyInstall()
          }
          return updated
        })

        setTimeout(() => terminalRef.current?.scrollToEnd(), 50)
      }

      termWs.onclose = () => {
        wsRef.current = null
        sessionIdRef.current = null
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

  const verifyInstall = useCallback(async () => {
    if (!server) {
      verifyingRef.current = false
      return
    }

    try {
      const status = await fetchGitSshStatus(server.ip, server.port)
      if (status.gh_cli_installed) {
        setDone(true)
        setHasError(false)
      }
    } catch {
      // Leave terminal output visible; user can retry if install verification fails.
    } finally {
      verifyingRef.current = false
    }
  }, [server])

  function handleSudoSubmit(password: string, remember: boolean) {
    setShowSudoPrompt(false)
    if (wsRef.current && sessionIdRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'terminal.input', sessionId: sessionIdRef.current, data: password + '\n' }))
    }
    if (remember && server) saveSudoPassword(server.ip, password)
  }

  function handleContinue() {
    dispatch({ type: 'STEP_COMPLETE', step: 'install-gh' })
  }

  function handleRetry() {
    setHasError(false)
    setDone(false)
    setOutput('')
    if (wsRef.current && sessionIdRef.current) {
      commandStartedRef.current = true
      wsRef.current.send(JSON.stringify({ type: 'terminal.input', sessionId: sessionIdRef.current, data: INSTALL_COMMAND + '\n' }))
    }
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Install GitHub CLI</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        GitHub CLI unlocks private repository discovery for the repo picker.
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
