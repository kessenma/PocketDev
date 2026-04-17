import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Linking, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, AppState, Image } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius } from '@pocketdev/shared/theme'
import { typeStyles } from '../../../theme/typography'
import { useConnectionStore } from '../../../stores/connection'
import {
  fetchGitHubCliAuthStatus,
  postConfigureGitHubCliToken,
  postStartGitHubCliAuth,
} from '../../../services/api'
import { Assets } from '../../../../assets'
import { CheckCircle, ChevronDown, ChevronUp, ExternalLink, KeyRound, ShieldCheck, Globe, Circle, CircleDot } from 'lucide-react-native'
import type { GitHubCliAuthSessionStatus } from '@pocketdev/shared/types'
import CopyButton from '../../shared/CopyButton'

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'authenticate'; authSession?: GitHubCliAuthSessionStatus | null }
  | { type: 'STEP_FAILED'; step: 'authenticate'; error: string }
  | { type: 'SET_AUTH_SESSION'; authSession: GitHubCliAuthSessionStatus | null }

type Method = 'browser' | 'token'

interface Props {
  dispatch: (action: WizardAction) => void
  authSession: GitHubCliAuthSessionStatus | null
}

const ANSI_RE = /\x1b\[[0-?]*[ -/]*[@-~]|\x1b\][^\x07]*(?:\x07|\x1b\\)|\x1b[@-_]/g
const CONTROL_RE = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g
const VERIFICATION_CODE_PATTERNS = [
  /[Oo]ne-?time code[:\s]+([A-Z0-9]{4}(?:-[A-Z0-9]{4})+)/i,
  /[Cc]ode[:\s]+([A-Z0-9]{4}(?:-[A-Z0-9]{4})+)/i,
  /\b([A-Z0-9]{4}(?:-[A-Z0-9]{4})+)\b/,
]

function normalizeOutput(text: string | null | undefined) {
  if (!text) return ''
  return text
    .replace(ANSI_RE, '')
    .replace(/\r/g, '\n')
    .replace(CONTROL_RE, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

function extractVerificationCode(text: string | null | undefined) {
  const normalized = normalizeOutput(text)
  for (const pattern of VERIFICATION_CODE_PATTERNS) {
    const match = normalized.match(pattern)
    if (match?.[1]) return match[1]
  }
  return null
}

export default function AuthenticateStep({ dispatch, authSession }: Props) {
  const { colors, isDark } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const [selectedMethod, setSelectedMethod] = useState<Method>('browser')
  const [session, setSession] = useState<GitHubCliAuthSessionStatus | null>(authSession)
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDebugOutput, setShowDebugOutput] = useState(false)
  const [waitingForBrowserAuth, setWaitingForBrowserAuth] = useState(false)

  const syncSession = useCallback((next: GitHubCliAuthSessionStatus) => {
    setSession(next)
    dispatch({ type: 'SET_AUTH_SESSION', authSession: next })
    if (next.authenticated) {
      setWaitingForBrowserAuth(false)
      dispatch({ type: 'STEP_COMPLETE', step: 'authenticate', authSession: next })
    }
    if (next.state === 'failed') {
      setWaitingForBrowserAuth(false)
    }
  }, [dispatch])

  const refreshSessionStatus = useCallback(async () => {
    if (!server || !session?.session_id) return
    try {
      const next = await fetchGitHubCliAuthStatus(server.ip, server.port, session.session_id)
      syncSession(next)
      if (next.state === 'failed' && next.error) {
        setError(next.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh GitHub CLI auth status.')
    }
  }, [server, session?.session_id, syncSession])

  useEffect(() => {
    if (!server || !session?.session_id || session.completed) return
    const timer = setInterval(() => {
      void refreshSessionStatus()
    }, 1500)
    return () => clearInterval(timer)
  }, [refreshSessionStatus, server, session])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && waitingForBrowserAuth) {
        void refreshSessionStatus()
      }
    })
    return () => subscription.remove()
  }, [refreshSessionStatus, waitingForBrowserAuth])

  async function handleStartBrowserFlow() {
    if (!server) return
    setLoading(true)
    setError(null)
    setWaitingForBrowserAuth(false)
    try {
      const next = await postStartGitHubCliAuth(server.ip, server.port)
      syncSession(next)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start GitHub sign-in.'
      setError(message)
      dispatch({ type: 'STEP_FAILED', step: 'authenticate', error: message })
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmitToken() {
    if (!server || !token.trim()) return
    setLoading(true)
    setError(null)
    setWaitingForBrowserAuth(false)
    try {
      const result = await postConfigureGitHubCliToken(server.ip, server.port, token.trim())
      if (!result.success) {
        const message = result.error ?? 'GitHub CLI authentication failed'
        setError(message)
        dispatch({ type: 'STEP_FAILED', step: 'authenticate', error: message })
        return
      }

      dispatch({
        type: 'STEP_COMPLETE',
        step: 'authenticate',
        authSession: session,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'GitHub CLI authentication failed'
      setError(message)
      dispatch({ type: 'STEP_FAILED', step: 'authenticate', error: message })
    } finally {
      setLoading(false)
    }
  }

  const helperText = session?.authenticated
    ? 'GitHub CLI is authenticated. Copilot can reuse this GitHub session.'
    : selectedMethod === 'browser'
      ? 'Start GitHub sign-in on the server, then finish it in your phone browser.'
      : 'Use a GitHub token only if you prefer not to use browser sign-in.'

  const normalizedOutputExcerpt = normalizeOutput(session?.output_excerpt)
  const fallbackVerificationCode = !session?.verification_code
    ? extractVerificationCode(session?.output_excerpt)
    : null
  const displayVerificationCode = session?.verification_code ?? fallbackVerificationCode

  async function handleOpenGitHub() {
    if (!session?.auth_url) return
    setWaitingForBrowserAuth(true)
    setError(null)
    try {
      await Linking.openURL(session.auth_url)
    } catch (err) {
      setWaitingForBrowserAuth(false)
      setError(err instanceof Error ? err.message : 'Failed to open GitHub.')
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={120}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image
            source={isDark ? Assets.githubWhite : Assets.githubBlack}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: colors.text }]}>Authenticate GitHub</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Copilot reuses the same GitHub CLI sign-in flow that PocketDev already uses for Git setup.
          </Text>
        </View>

        <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.statusHeader}>
            <ShieldCheck color={session?.authenticated ? '#22c55e' : colors.primary} size={18} strokeWidth={2.25} />
            <Text style={[styles.statusTitle, { color: colors.text }]}>GitHub account</Text>
          </View>
          <Text style={[styles.statusCopy, { color: error ? colors.error : colors.textSecondary }]}>
            {error ?? helperText}
          </Text>
        </View>

        {!session?.authenticated && (
          <View style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Authenticate GitHub CLI with</Text>
            <MethodOption
              label="Browser sign-in"
              description="Recommended. Start GitHub CLI login on the server, then open the GitHub verification page in your phone browser."
              selected={selectedMethod === 'browser'}
              onPress={() => setSelectedMethod('browser')}
              colors={colors}
              icon={<Globe color={selectedMethod === 'browser' ? colors.primary : colors.textTertiary} size={18} strokeWidth={2.25} />}
            />
            <MethodOption
              label="Access token"
              description="Fallback. Paste a GitHub token if you prefer not to use browser login."
              selected={selectedMethod === 'token'}
              onPress={() => setSelectedMethod('token')}
              colors={colors}
              icon={<KeyRound color={selectedMethod === 'token' ? colors.primary : colors.textTertiary} size={18} strokeWidth={2.25} />}
            />

            {selectedMethod === 'browser' ? (
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                onPress={() => void handleStartBrowserFlow()}
                activeOpacity={0.7}
                disabled={loading}
              >
                <Text style={[styles.buttonText, { color: colors.primaryText }]}>
                  {loading ? 'Starting...' : 'Continue with browser'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.tokenSection}>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                  value={token}
                  onChangeText={setToken}
                  placeholder="GitHub token"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                />
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                  onPress={() => void handleSubmitToken()}
                  activeOpacity={0.7}
                  disabled={loading || token.trim().length === 0}
                >
                  <Text style={[styles.buttonText, { color: colors.primaryText }]}>
                    {loading ? 'Authenticating...' : 'Continue with token'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {selectedMethod === 'browser' && displayVerificationCode && !session?.authenticated && (
          <View style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Step 1: Copy the code</Text>
            <Text style={[styles.cardCopy, { color: colors.textSecondary }]}>
              GitHub may ask for this one-time code after you open the verification page.
            </Text>
            <View style={[styles.codeBox, { backgroundColor: colors.background }]}>
              <Text style={[styles.codeText, { color: colors.text }]} selectable>
                {displayVerificationCode}
              </Text>
            </View>
            <CopyButton value={displayVerificationCode} label="Copy code" />
          </View>
        )}

        {selectedMethod === 'browser' && session?.auth_url && !session?.authenticated && (
          <View style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Step 2: Open GitHub</Text>
            <Text style={[styles.cardCopy, { color: colors.textSecondary }]}>
              Open the GitHub verification page, complete sign-in, then return here. PocketDev will detect the finished GitHub CLI session.
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={() => void handleOpenGitHub()}
              activeOpacity={0.7}
            >
              <ExternalLink color={colors.primaryText} size={18} strokeWidth={2.25} />
              <Text style={[styles.buttonText, { color: colors.primaryText }]}>
                {waitingForBrowserAuth ? 'Re-open GitHub' : 'Open GitHub'}
              </Text>
            </TouchableOpacity>
            <CopyButton value={session.auth_url} label="Copy URL" />
          </View>
        )}

        {session?.output_excerpt ? (
          <View style={[styles.debugCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity
              style={styles.debugToggle}
              onPress={() => setShowDebugOutput((value) => !value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.debugTitle, { color: colors.text }]}>CLI output</Text>
              {showDebugOutput ? (
                <ChevronUp color={colors.textTertiary} size={18} strokeWidth={2.25} />
              ) : (
                <ChevronDown color={colors.textTertiary} size={18} strokeWidth={2.25} />
              )}
            </TouchableOpacity>
            {showDebugOutput ? (
              <Text style={[styles.debugText, { color: colors.textSecondary }]}>
                {normalizedOutputExcerpt}
              </Text>
            ) : null}
          </View>
        ) : null}

        {session?.authenticated ? (
          <View style={[styles.successBanner, { backgroundColor: colors.successBackground, borderColor: colors.success }]}>
            <CheckCircle color={colors.success} size={18} strokeWidth={2.25} />
            <Text style={[styles.successText, { color: colors.success }]}>
              GitHub authentication succeeded. Continuing to Copilot trust setup...
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function MethodOption({
  label,
  description,
  selected,
  onPress,
  colors,
  icon,
}: {
  label: string
  description: string
  selected: boolean
  onPress: () => void
  colors: ReturnType<typeof useTheme>['colors']
  icon: React.ReactNode
}) {
  return (
    <TouchableOpacity
      style={[
        styles.methodOption,
        {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors.surface : colors.background,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.methodHeader}>
        <View style={styles.methodTitleRow}>
          {icon}
          <Text style={[styles.methodTitle, { color: colors.text }]}>{label}</Text>
        </View>
        {selected ? (
          <CircleDot color={colors.primary} size={18} strokeWidth={2.25} />
        ) : (
          <Circle color={colors.textTertiary} size={18} strokeWidth={2.25} />
        )}
      </View>
      <Text style={[styles.methodDescription, { color: colors.textSecondary }]}>{description}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing[3],
    paddingBottom: spacing[4],
  },
  hero: {
    alignItems: 'center',
    gap: spacing[2],
    paddingTop: spacing[4],
  },
  logo: {
    width: 42,
    height: 42,
  },
  title: {
    ...typeStyles.heading,
    textAlign: 'center',
  },
  subtitle: {
    ...typeStyles.bodySmall,
    textAlign: 'center',
  },
  statusCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[2],
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  statusTitle: {
    ...typeStyles.bodyBold,
  },
  statusCopy: {
    ...typeStyles.bodySmall,
  },
  actionCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[3],
  },
  cardTitle: {
    ...typeStyles.bodyBold,
  },
  cardCopy: {
    ...typeStyles.bodySmall,
  },
  methodOption: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    gap: spacing[2],
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  methodTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flex: 1,
  },
  methodTitle: {
    ...typeStyles.bodySmall,
    fontWeight: '700',
  },
  methodDescription: {
    ...typeStyles.bodySmall,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
  },
  buttonText: {
    ...typeStyles.button,
  },
  tokenSection: {
    gap: spacing[3],
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    ...typeStyles.body,
  },
  codeBox: {
    borderRadius: borderRadius.md,
    padding: spacing[3],
  },
  codeText: {
    ...typeStyles.heading,
    textAlign: 'center',
  },
  debugCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[3],
  },
  debugToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  debugTitle: {
    ...typeStyles.bodyBold,
  },
  debugText: {
    ...typeStyles.mono,
  },
  successBanner: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  successText: {
    ...typeStyles.bodySmall,
    flex: 1,
  },
})
