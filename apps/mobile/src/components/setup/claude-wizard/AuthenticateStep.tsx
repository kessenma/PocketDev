import React, { useState, useCallback, useRef } from 'react'
import { View, Text, Image, TouchableOpacity, TextInput, Linking, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useTerminalCommand } from '../../../hooks/useTerminalCommand'
import { Assets } from '../../../../assets'
import { ExternalLink, CheckCircle, RefreshCw, Send, LogIn, ChevronDown, ChevronUp } from 'lucide-react-native'

const AUTH_COMMAND = 'claude auth login'
const URL_PATTERN = /https:\/\/[^\s\]\)>"']+/g
const ERROR_PATTERNS = [/^error:/im, /^fatal:/im, /permission denied/im, /command not found/im]

type AuthPhase = 'running' | 'url-detected' | 'opened' | 'done' | 'failed'

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'authenticate' }
  | { type: 'STEP_FAILED'; step: 'authenticate'; error: string }

interface Props {
  dispatch: (action: WizardAction) => void
}

export default function AuthenticateStep({ dispatch }: Props) {
  const { colors, isDark } = useTheme()
  const [phase, setPhase] = useState<AuthPhase>('running')
  const [oauthUrl, setOauthUrl] = useState<string | null>(null)
  const [connectionString, setConnectionString] = useState('')
  const [showOutput, setShowOutput] = useState(false)
  const scrollRef = useRef<ScrollView>(null)

  const {
    output, hasError, done,
    sendCommand, sendInput, reset,
  } = useTerminalCommand({
    initialCommand: AUTH_COMMAND,
    errorPatterns: ERROR_PATTERNS,
    onOutput: (chunk, fullOutput) => {
      // Detect OAuth URL in cumulative output
      const urls = fullOutput.match(URL_PATTERN)
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

  // Track terminal exit
  if (done && phase !== 'done' && phase !== 'failed') {
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

  function handleRetry() {
    reset()
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

      {/* Auth flow card */}
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
