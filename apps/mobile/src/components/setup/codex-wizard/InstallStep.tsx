import React, { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useConnectionStore } from '../../../stores/connection'
import { buildTerminalWsUrl } from '../../../services/api'
import { buildPocketDevAuthorizationHeader } from '../../../services/auth'
import { createReactNativeWebSocket } from '../../../services/websocket'
import { getSudoPassword, saveSudoPassword } from '../../../services/secure-storage'
import SudoPrompt from '../SudoPrompt'
import TerminalView, { type TerminalViewRef } from '../../shared/TerminalView'
import { Assets } from '../../../../assets'
import { CheckCircle, RefreshCw } from 'lucide-react-native'

const INSTALL_COMMAND = 'npm i -g @openai/codex'
const SUDO_PROMPT_PATTERN = /\[sudo\] password for/
const ERROR_PATTERNS = [/^E: /m, /^error:/im, /^fatal:/im, /permission denied/im, /npm ERR!/im, /command not found.*npm/im]

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'install' }
  | { type: 'STEP_FAILED'; step: 'install'; error: string }

interface Props {
  dispatch: (action: WizardAction) => void
}

export default function InstallStep({ dispatch }: Props) {
  const { colors, isDark } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const [output, setOutput] = useState('')
  const [hasError, setHasError] = useState(false)
  const [npmMissing, setNpmMissing] = useState(false)
  const [showSudoPrompt, setShowSudoPrompt] = useState(false)
  const [done, setDone] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
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
      setOutput('')
      setHasError(false)
      setNpmMissing(false)

      termWs.onopen = () => {
        termWs.send(JSON.stringify({ type: 'terminal.input', data: INSTALL_COMMAND + '\n' }))
      }

      termWs.onmessage = (event) => {
        let text: string
        try {
          const msg = JSON.parse(event.data as string)
          if (msg.type === 'terminal.output') text = msg.data
          else if (msg.type === 'terminal.exited') text = `\n[Process exited: ${msg.exitCode}]\n`
          else return
        } catch { text = event.data as string }

        setOutput((prev) => {
          const updated = prev + text
          if (SUDO_PROMPT_PATTERN.test(text)) handleSudoNeeded()
          if (/command not found.*npm/im.test(text) || /npm: not found/im.test(text)) {
            setNpmMissing(true)
          }
          for (const p of ERROR_PATTERNS) {
            if (p.test(text)) { setHasError(true); break }
          }
          return updated
        })

        setTimeout(() => terminalRef.current?.scrollToEnd(), 50)
      }

      termWs.onclose = () => {
        wsRef.current = null
        setDone(true)
      }
    })()

    return () => {
      cancelled = true
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [server])

  const handleSudoNeeded = useCallback(async () => {
    if (!server) return
    const stored = await getSudoPassword(server.ip)
    if (stored && wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'terminal.input', data: stored + '\n' }))
      return
    }
    setShowSudoPrompt(true)
  }, [server])

  function handleSudoSubmit(password: string, remember: boolean) {
    setShowSudoPrompt(false)
    wsRef.current?.send(JSON.stringify({ type: 'terminal.input', data: password + '\n' }))
    if (remember && server) saveSudoPassword(server.ip, password)
  }

  function handleContinue() {
    dispatch({ type: 'STEP_COMPLETE', step: 'install' })
  }

  function handleRetry() {
    setHasError(false)
    setNpmMissing(false)
    setDone(false)
    setOutput('')
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'terminal.input', data: INSTALL_COMMAND + '\n' }))
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Image
          source={isDark ? Assets.codexWhite : Assets.codexBlack}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>Install Codex CLI</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Installing via npm...
          </Text>
        </View>
      </View>

      <View style={styles.terminalWrapper}>
        <TerminalView ref={terminalRef} output={output} placeholder="Connecting..." />
      </View>

      {npmMissing && (
        <View style={[styles.hintCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.hintText, { color: colors.textSecondary }]}>
            npm was not found. Make sure Node.js and npm are installed first — check the setup checklist.
          </Text>
        </View>
      )}

      {done && !hasError && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={handleContinue}
          activeOpacity={0.7}
        >
          <CheckCircle color={colors.primaryText} size={18} strokeWidth={2.25} />
          <Text style={[styles.buttonText, { color: colors.primaryText }]}>Continue</Text>
        </TouchableOpacity>
      )}

      {hasError && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.error }]}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  logo: {
    width: 36,
    height: 36,
  },
  headerText: {
    flex: 1,
    gap: 2,
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
  hintCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
  },
  hintText: {
    ...typographyScale.sm,
  },
  actionButton: {
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
