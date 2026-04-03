import React, { useState, useCallback, useRef, useEffect } from 'react'
import { View, Text, Image, TouchableOpacity, TextInput, Linking, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useTerminalCommand } from '../../../hooks/useTerminalCommand'
import { useConnectionStore } from '../../../stores/connection'
import { fetchClaudeSetupStatus } from '../../../services/api'
import { Assets } from '../../../../assets'
import { ExternalLink, CheckCircle, RefreshCw, Send, LogIn, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react-native'

// Running `claude` triggers the login flow on first use
const AUTH_COMMAND = 'claude'
const URL_PATTERN = /https:\/\/[^\s\]\)>"']+/g
const ERROR_PATTERNS = [/^error:/im, /^fatal:/im, /permission denied/im, /command not found/im]
// NOTE: Do NOT include /welcome/i — "Welcome to Claude Code" appears on first run before login
const AUTH_SUCCESS_PATTERNS = [/successfully authenticated/i, /logged in as/i, /you are logged in/i]
// Detect the first-run theme selector so we can auto-pick it
const THEME_SELECTOR_PATTERN = /choose the text style|Dark mode|Light mode/i
// Strip ANSI codes for cleaner pattern matching
const ANSI_RE = /\x1b\[[0-9;]*[a-zA-Z]|\x1b\][^\x07]*\x07|\x1b\][\d;]*[^\x07]*\x07/g

type AuthPhase = 'checking' | 'not-installed' | 'running' | 'url-detected' | 'opened' | 'done' | 'failed'

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'authenticate' }
  | { type: 'STEP_FAILED'; step: 'authenticate'; error: string }
  | { type: 'GO_BACK' }

interface Props {
  dispatch: (action: WizardAction) => void
}

export default function AuthenticateStep({ dispatch }: Props) {
  const { colors, isDark } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const [phase, setPhase] = useState<AuthPhase>('checking')
  const [oauthUrl, setOauthUrl] = useState<string | null>(null)
  const [connectionString, setConnectionString] = useState('')
  const [showOutput, setShowOutput] = useState(false)
  const scrollRef = useRef<ScrollView>(null)
  const phaseRef = useRef<AuthPhase>('checking')
  phaseRef.current = phase

  // Pre-check: verify claude is installed before attempting auth
  useEffect(() => {
    if (!server) return
    ;(async () => {
      try {
        const status = await fetchClaudeSetupStatus(server.ip, server.port)
        if (status.installed) {
          setPhase('running')
        } else {
          setPhase('not-installed')
        }
      } catch {
        // If check fails, try auth anyway
        setPhase('running')
      }
    })()
  }, [server])

  const themeHandledRef = useRef(false)

  const {
    output, hasError, done, connected,
    sendCommand, sendInput, reset,
  } = useTerminalCommand({
    errorPatterns: ERROR_PATTERNS,
    onOutput: (chunk, fullOutput) => {
      const cleanChunk = chunk.replace(ANSI_RE, '')
      const cleanFull = fullOutput.replace(ANSI_RE, '')

      // Auto-select theme on first run — send "1" to pick Dark mode
      if (!themeHandledRef.current && THEME_SELECTOR_PATTERN.test(cleanChunk)) {
        themeHandledRef.current = true
        console.log('[claude-auth] Theme selector detected, auto-selecting Dark mode')
        setTimeout(() => sendInput('1\n'), 500)
        return
      }

      // Detect auth success in output
      for (const p of AUTH_SUCCESS_PATTERNS) {
        if (p.test(cleanChunk) && phaseRef.current !== 'done') {
          setPhase('done')
          return
        }
      }

      // Detect OAuth URL in cumulative output
      const urls = cleanFull.match(URL_PATTERN)
      if (urls && !oauthUrl) {
        const authUrl = urls.find((u) =>
          u.includes('anthropic.com') || u.includes('claude.ai') || u.includes('oauth') || u.includes('auth'),
        ) ?? urls[urls.length - 1]
        setOauthUrl(authUrl)
        setPhase('url-detected')
      }

      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50)
    },
  })

  // Send auth command when both WS is connected and pre-check passed
  const authSentRef = useRef(false)
  useEffect(() => {
    if (connected && phase === 'running' && !authSentRef.current) {
      authSentRef.current = true
      console.log('[claude-auth] WS connected + pre-check passed, sending auth command')
      setTimeout(() => sendCommand(AUTH_COMMAND), 300)
    }
  }, [connected, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Track terminal exit
  if (done && phase !== 'done' && phase !== 'failed' && phase !== 'checking' && phase !== 'not-installed') {
    if (hasError) {
      setPhase('failed')
    } else {
      setPhase('done')
    }
  }

  const handleOpenBrowser = useCallback(() => {
    if (oauthUrl) {
      Linking.openURL(oauthUrl)
      setPhase('opened')
    }
  }, [oauthUrl])

  const handleSubmitCode = useCallback(() => {
    if (!connectionString.trim()) return
    sendInput(connectionString.trim() + '\n')
    setConnectionString('')
  }, [connectionString, sendInput])

  const handleContinue = useCallback(() => {
    dispatch({ type: 'STEP_COMPLETE', step: 'authenticate' })
  }, [dispatch])

  // Manual "I've signed in" — verify via API then continue
  const handleManualComplete = useCallback(async () => {
    if (!server) return
    try {
      const status = await fetchClaudeSetupStatus(server.ip, server.port)
      if (status.authenticated) {
        setPhase('done')
      } else {
        // Not authenticated yet — keep waiting
        setPhase('opened')
      }
    } catch {
      // API failed, just try continuing to verify step
      dispatch({ type: 'STEP_COMPLETE', step: 'authenticate' })
    }
  }, [server, dispatch])

  function handleRetry() {
    reset()
    authSentRef.current = false
    themeHandledRef.current = false
    setPhase('running')
    setOauthUrl(null)
    setConnectionString('')
    sendCommand(AUTH_COMMAND)
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={120}
    >
      {/* Header */}
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

      {/* Pre-check: not installed */}
      {phase === 'checking' && (
        <View style={[styles.flowCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.flowRow}>
            <ActivityIndicator color={colors.primary} size="small" />
            <View style={styles.flowInfo}>
              <Text style={[styles.flowTitle, { color: colors.text }]}>Checking Claude CLI...</Text>
              <Text style={[styles.flowHint, { color: colors.textTertiary }]}>
                Verifying installation before authentication
              </Text>
            </View>
          </View>
        </View>
      )}

      {phase === 'not-installed' && (
        <View style={[styles.flowCard, { backgroundColor: colors.surface, borderColor: colors.error }]}>
          <View style={styles.flowRow}>
            <AlertTriangle color={colors.error} size={20} strokeWidth={2} />
            <View style={styles.flowInfo}>
              <Text style={[styles.flowTitle, { color: colors.text }]}>Claude CLI not found</Text>
              <Text style={[styles.flowHint, { color: colors.error }]}>
                Go back to the install step and ensure Claude is installed first.
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Auth flow card */}
      {phase !== 'checking' && phase !== 'not-installed' && (
      <View style={[
        styles.flowCard,
        {
          backgroundColor: colors.surface,
          borderColor: phase === 'done' ? '#22c55e'
            : phase === 'failed' ? colors.error
            : phase === 'opened' ? colors.primary
            : colors.border,
        },
      ]}>
        {phase === 'running' && (
          <View style={styles.flowRow}>
            <ActivityIndicator color={colors.primary} size="small" />
            <View style={styles.flowInfo}>
              <Text style={[styles.flowTitle, { color: colors.text }]}>Starting authentication...</Text>
              <Text style={[styles.flowHint, { color: colors.textTertiary }]}>
                Waiting for sign-in URL from Claude CLI
              </Text>
            </View>
          </View>
        )}

        {phase === 'url-detected' && (
          <View style={styles.flowContent}>
            <View style={styles.flowRow}>
              <LogIn color={colors.primary} size={20} strokeWidth={2} />
              <Text style={[styles.flowTitle, { color: colors.text }]}>Sign-in URL ready</Text>
            </View>
            <Text style={[styles.flowHint, { color: colors.textSecondary }]}>
              Open this link in your browser to authenticate:
            </Text>
            <TouchableOpacity
              style={[styles.openButton, { backgroundColor: colors.primary }]}
              onPress={handleOpenBrowser}
              activeOpacity={0.7}
            >
              <ExternalLink color={colors.primaryText} size={16} strokeWidth={2.25} />
              <Text style={[styles.buttonText, { color: colors.primaryText }]}>Open in Browser</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === 'opened' && (
          <View style={styles.flowContent}>
            <View style={styles.flowRow}>
              <LogIn color={colors.primary} size={20} strokeWidth={2} />
              <Text style={[styles.flowTitle, { color: colors.text }]}>Complete sign-in</Text>
            </View>
            <Text style={[styles.flowHint, { color: colors.textSecondary }]}>
              Finish signing in in your browser. If prompted, paste the code below:
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
          </View>
        )}

        {phase === 'done' && (
          <View style={styles.flowRow}>
            <View style={[styles.doneCircle, { backgroundColor: '#22c55e' }]}>
              <CheckCircle color="#fff" size={14} strokeWidth={2.5} />
            </View>
            <View style={styles.flowInfo}>
              <Text style={[styles.flowTitle, { color: colors.text }]}>Signed in</Text>
              <Text style={[styles.flowHint, { color: '#22c55e' }]}>Authentication successful</Text>
            </View>
          </View>
        )}

        {phase === 'failed' && (
          <View style={styles.flowRow}>
            <View style={[styles.doneCircle, { backgroundColor: colors.error }]}>
              <RefreshCw color="#fff" size={14} strokeWidth={2.5} />
            </View>
            <View style={styles.flowInfo}>
              <Text style={[styles.flowTitle, { color: colors.text }]}>Authentication failed</Text>
              <Text style={[styles.flowHint, { color: colors.error }]}>See terminal output for details</Text>
            </View>
          </View>
        )}
      </View>
      )}

      {/* "I've signed in" manual button — shown after URL is opened */}
      {phase === 'opened' && (
        <TouchableOpacity
          style={[styles.manualCompleteButton, { borderColor: colors.border }]}
          onPress={handleManualComplete}
          activeOpacity={0.7}
        >
          <CheckCircle color={colors.primary} size={16} strokeWidth={2.25} />
          <Text style={[styles.manualCompleteText, { color: colors.text }]}>I've completed sign-in</Text>
        </TouchableOpacity>
      )}

      {/* Collapsible terminal output */}
      <TouchableOpacity
        style={[styles.outputToggle, { borderColor: colors.border }]}
        onPress={() => setShowOutput(!showOutput)}
        activeOpacity={0.7}
      >
        <Text style={[styles.outputToggleText, { color: colors.textTertiary }]}>
          Terminal output
        </Text>
        {showOutput
          ? <ChevronUp color={colors.textTertiary} size={16} strokeWidth={2} />
          : <ChevronDown color={colors.textTertiary} size={16} strokeWidth={2} />}
      </TouchableOpacity>

      {showOutput && (
        <ScrollView
          ref={scrollRef}
          style={[styles.outputBox, { backgroundColor: colors.background }]}
          nestedScrollEnabled
        >
          <Text style={[styles.outputText, { color: colors.textSecondary }]} selectable>
            {output || 'Waiting for output...'}
          </Text>
        </ScrollView>
      )}

      {/* Actions */}
      {phase === 'not-installed' && (
        <TouchableOpacity
          style={[styles.actionButton, { borderColor: colors.border, borderWidth: 1 }]}
          onPress={() => dispatch({ type: 'GO_BACK' })}
          activeOpacity={0.7}
        >
          <Text style={[styles.buttonText, { color: colors.text }]}>Go Back</Text>
        </TouchableOpacity>
      )}

      {phase === 'done' && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={handleContinue}
          activeOpacity={0.7}
        >
          <CheckCircle color={colors.primaryText} size={18} strokeWidth={2.25} />
          <Text style={[styles.buttonText, { color: colors.primaryText }]}>Continue</Text>
        </TouchableOpacity>
      )}

      {phase === 'failed' && (
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
  flowCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
  },
  flowContent: {
    gap: spacing[3],
  },
  flowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  flowInfo: {
    flex: 1,
    gap: 2,
  },
  flowTitle: {
    ...typographyScale.base,
    fontWeight: '600',
  },
  flowHint: {
    ...typographyScale.xs,
    fontWeight: '500',
  },
  doneCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
  outputToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderWidth: 1,
    borderRadius: borderRadius.md,
  },
  outputToggleText: {
    ...typographyScale.xs,
    fontWeight: '500',
  },
  outputBox: {
    flex: 1,
    borderRadius: borderRadius.md,
    padding: spacing[3],
  },
  outputText: {
    ...typographyScale.xs,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  manualCompleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  manualCompleteText: {
    ...typographyScale.sm,
    fontWeight: '600',
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
