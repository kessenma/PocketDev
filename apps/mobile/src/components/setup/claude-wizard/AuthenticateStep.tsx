import React, { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, Image, TouchableOpacity, TextInput, Linking, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useConnectionStore } from '../../../stores/connection'
import { buildTerminalWsUrl } from '../../../services/api'
import { buildPocketDevAuthorizationHeader } from '../../../services/auth'
import { createReactNativeWebSocket } from '../../../services/websocket'
import { Assets } from '../../../../assets'
import TerminalView, { type TerminalViewRef } from '../../shared/TerminalView'
import { ExternalLink, CheckCircle, RefreshCw, Send } from 'lucide-react-native'

const AUTH_COMMAND = 'claude auth login'
const URL_PATTERN = /https:\/\/[^\s\]\)>]+/g
const ERROR_PATTERNS = [/^error:/im, /^fatal:/im, /permission denied/im, /not found/im]

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'authenticate' }
  | { type: 'STEP_FAILED'; step: 'authenticate'; error: string }

interface Props {
  dispatch: (action: WizardAction) => void
}

export default function AuthenticateStep({ dispatch }: Props) {
  const { colors, isDark } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const [output, setOutput] = useState('')
  const [oauthUrl, setOauthUrl] = useState<string | null>(null)
  const [opened, setOpened] = useState(false)
  const [connectionString, setConnectionString] = useState('')
  const [hasError, setHasError] = useState(false)
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
      setOauthUrl(null)
      setOpened(false)
      setConnectionString('')

      termWs.onopen = () => {
        termWs.send(JSON.stringify({ type: 'terminal.input', data: AUTH_COMMAND + '\n' }))
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

          // Detect OAuth URL in cumulative output
          const urls = updated.match(URL_PATTERN)
          if (urls) {
            const authUrl = urls.find((u) =>
              u.includes('anthropic.com') || u.includes('claude.ai') || u.includes('oauth') || u.includes('auth'),
            ) ?? urls[urls.length - 1]
            setOauthUrl(authUrl)
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

  const handleOpenBrowser = useCallback(() => {
    if (oauthUrl) {
      Linking.openURL(oauthUrl)
      setOpened(true)
    }
  }, [oauthUrl])

  const handleSubmitCode = useCallback(() => {
    if (!connectionString.trim() || !wsRef.current) return
    wsRef.current.send(JSON.stringify({ type: 'terminal.input', data: connectionString.trim() + '\n' }))
    setConnectionString('')
  }, [connectionString])

  const handleContinue = useCallback(() => {
    dispatch({ type: 'STEP_COMPLETE', step: 'authenticate' })
  }, [dispatch])

  function handleRetry() {
    setHasError(false)
    setDone(false)
    setOutput('')
    setOauthUrl(null)
    setOpened(false)
    setConnectionString('')
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'terminal.input', data: AUTH_COMMAND + '\n' }))
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={120}
    >
      <View style={styles.headerRow}>
        <Image
          source={isDark ? Assets.claudeWhite : Assets.claudeBlack}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>Sign In to Anthropic</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Authenticate Claude CLI with your Anthropic account
          </Text>
        </View>
      </View>

      <View style={styles.terminalWrapper}>
        <TerminalView ref={terminalRef} output={output} placeholder="Starting authentication..." />
      </View>

      {/* OAuth URL detected — show Open in Browser card */}
      {oauthUrl && !done && (
        <View style={[styles.urlCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {!opened ? (
            <>
              <Text style={[styles.urlHint, { color: colors.textSecondary }]}>
                Open this link to sign in:
              </Text>
              <TouchableOpacity
                style={[styles.openButton, { backgroundColor: colors.primary }]}
                onPress={handleOpenBrowser}
                activeOpacity={0.7}
              >
                <ExternalLink color={colors.primaryText} size={16} strokeWidth={2.25} />
                <Text style={[styles.buttonText, { color: colors.primaryText }]}>Open in Browser</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.urlHint, { color: colors.textSecondary }]}>
                Complete sign-in in your browser, then paste the code here:
              </Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={connectionString}
                  onChangeText={setConnectionString}
                  placeholder="Paste code here..."
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[styles.sendButton, { backgroundColor: connectionString.trim() ? colors.primary : colors.border }]}
                  onPress={handleSubmitCode}
                  disabled={!connectionString.trim()}
                  activeOpacity={0.7}
                >
                  <Send color={colors.primaryText} size={16} strokeWidth={2.25} />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}

      {/* Process exited successfully */}
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
    </KeyboardAvoidingView>
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
    minHeight: 120,
  },
  urlCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[3],
  },
  urlHint: {
    ...typographyScale.sm,
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    ...typographyScale.sm,
    fontFamily: 'monospace',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
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
