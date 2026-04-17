import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Linking, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, AppState } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius } from '@pocketdev/shared/theme'
import { typeStyles } from '../../../theme/typography'
import { useConnectionStore } from '../../../stores/connection'
import {
  fetchGitHubCliAuthStatus,
  postConfigureGitHubCliToken,
  postStartGitHubCliAuth,
} from '../../../services/api'
import { CheckCircle, ChevronDown, ChevronUp, ExternalLink, KeyRound, ShieldCheck, Globe, Circle, CircleDot } from 'lucide-react-native'
import type { GitHubCliAuthSessionStatus } from '@pocketdev/shared/types'
import CopyButton from '../../shared/CopyButton'

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'github-cli-auth' }
  | { type: 'STEP_FAILED'; step: 'github-cli-auth'; error: string }
  | { type: 'SET_GITHUB_USERNAME'; username: string }

type Method = 'browser' | 'token'

interface Props {
  dispatch: (action: WizardAction) => void
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

export default function GitHubCliAuthStep({ dispatch }: Props) {
  const { colors } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const [selectedMethod, setSelectedMethod] = useState<Method>('browser')
  const [session, setSession] = useState<GitHubCliAuthSessionStatus | null>(null)
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDebugOutput, setShowDebugOutput] = useState(false)
  const [waitingForBrowserAuth, setWaitingForBrowserAuth] = useState(false)

  const syncSession = useCallback((next: GitHubCliAuthSessionStatus) => {
    setSession(next)
    if (next.github_username) {
      dispatch({ type: 'SET_GITHUB_USERNAME', username: next.github_username })
    }
    if (next.authenticated && next.private_repo_access) {
      setWaitingForBrowserAuth(false)
      dispatch({ type: 'STEP_COMPLETE', step: 'github-cli-auth' })
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
      dispatch({ type: 'STEP_FAILED', step: 'github-cli-auth', error: message })
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
        dispatch({ type: 'STEP_FAILED', step: 'github-cli-auth', error: message })
        return
      }

      if (result.github_username) {
        dispatch({ type: 'SET_GITHUB_USERNAME', username: result.github_username })
      }
      dispatch({ type: 'STEP_COMPLETE', step: 'github-cli-auth' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'GitHub CLI authentication failed'
      setError(message)
      dispatch({ type: 'STEP_FAILED', step: 'github-cli-auth', error: message })
    } finally {
      setLoading(false)
    }
  }

  const helperText = session?.authenticated
    ? session.private_repo_access
      ? 'GitHub CLI is authenticated and private repository access is enabled.'
      : 'GitHub CLI signed in, but private repository access could not be verified yet.'
    : selectedMethod === 'browser'
      ? 'Start a GitHub sign-in flow on the paired server, then finish it in your mobile browser.'
      : 'Use a GitHub token only if you prefer not to use the browser sign-in flow.'

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
        <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.statusHeader}>
            <ShieldCheck color={session?.authenticated ? '#22c55e' : colors.primary} size={18} strokeWidth={2.25} />
            <Text style={[styles.statusTitle, { color: colors.text }]}>Private Repo Access</Text>
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
              description="Fallback. Paste a GitHub token with repo read access if you prefer not to use browser login."
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
              GitHub will ask for this one-time code after you open the verification page.
            </Text>
            {fallbackVerificationCode ? (
              <Text style={[styles.fallbackNote, { color: colors.textTertiary }]}>
                Using a fallback code extracted from the terminal output.
              </Text>
            ) : null}
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
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {displayVerificationCode ? 'Step 2: Open GitHub' : 'Open GitHub'}
            </Text>
            <Text style={[styles.cardCopy, { color: colors.textSecondary }]}>
              {displayVerificationCode
                ? 'After GitHub opens, paste the code you copied in the previous step and complete sign-in.'
                : 'Open the GitHub verification page in your mobile browser and complete the GitHub CLI sign-in.'}
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={() => void handleOpenGitHub()}
              activeOpacity={0.7}
            >
              <ExternalLink color={colors.primaryText} size={18} strokeWidth={2.25} />
              <Text style={[styles.buttonText, { color: colors.primaryText }]}>Open GitHub</Text>
            </TouchableOpacity>
            <CopyButton value={session.auth_url} label="Copy URL" />
          </View>
        )}

        {selectedMethod === 'browser' && waitingForBrowserAuth && !session?.authenticated ? (
          <View style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.waitingHeader}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Waiting For GitHub Approval</Text>
            </View>
            <Text style={[styles.cardCopy, { color: colors.textSecondary }]}>
              Finish the browser sign-in, then return to PocketDev. This step will advance automatically as soon as the server reports GitHub CLI is authenticated.
            </Text>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={() => void refreshSessionStatus()}
              activeOpacity={0.7}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Check Again</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {selectedMethod === 'browser' && session && !session.authenticated && !session.verification_code && !session.auth_url ? (
          <View style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Preparing GitHub sign-in</Text>
            <Text style={[styles.cardCopy, { color: colors.textSecondary }]}>
              Waiting for the paired server to produce the GitHub verification link and one-time code.
            </Text>
            {session.output_excerpt ? (
              <Text style={[styles.outputText, { color: colors.textTertiary }]}>
                {session.output_excerpt}
              </Text>
            ) : null}
          </View>
        ) : null}

        {selectedMethod === 'browser' && session && !session.authenticated && normalizedOutputExcerpt ? (
          <View style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity
              style={styles.debugHeader}
              onPress={() => setShowDebugOutput((current) => !current)}
              activeOpacity={0.8}
            >
              <View style={styles.debugHeaderText}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Troubleshooting Output</Text>
                <Text style={[styles.cardCopy, { color: colors.textSecondary }]}>
                  Expand to inspect the raw GitHub CLI prompt if the code card does not appear.
                </Text>
              </View>
              {showDebugOutput
                ? <ChevronUp color={colors.textSecondary} size={18} strokeWidth={2.25} />
                : <ChevronDown color={colors.textSecondary} size={18} strokeWidth={2.25} />}
            </TouchableOpacity>

            {showDebugOutput ? (
              <>
                {fallbackVerificationCode ? (
                  <View style={[styles.fallbackCodeCard, { backgroundColor: colors.background }]}>
                    <Text style={[styles.fallbackLabel, { color: colors.textTertiary }]}>Detected Code</Text>
                    <Text style={[styles.fallbackCodeText, { color: colors.text }]} selectable>
                      {fallbackVerificationCode}
                    </Text>
                    <CopyButton value={fallbackVerificationCode} label="Copy detected code" />
                  </View>
                ) : null}
                <Text style={[styles.outputText, { color: colors.textSecondary }]}>
                  {normalizedOutputExcerpt}
                </Text>
              </>
            ) : null}
          </View>
        ) : null}

        {session?.authenticated ? (
          <View style={[styles.successCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <CheckCircle color="#22c55e" size={20} strokeWidth={2.25} />
            <Text style={[styles.successTitle, { color: colors.text }]}>GitHub CLI is ready</Text>
            <Text style={[styles.cardCopy, { color: colors.textSecondary }]}>
              {session.github_username ? `Signed in as @${session.github_username}. ` : ''}
              {session.private_repo_access
                ? 'Private repositories are now available in the repo picker.'
                : 'Sign-in worked, but private repo access was not confirmed.'}
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
        styles.optionCard,
        {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors.primary + '10' : colors.background,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.optionHeader}>
        {icon}
        <Text style={[styles.optionTitle, { color: colors.text }]}>{label}</Text>
        {selected
          ? <CircleDot color={colors.primary} size={18} strokeWidth={2.1} />
          : <Circle color={colors.textTertiary} size={18} strokeWidth={2.1} />}
      </View>
      <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>{description}</Text>
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
    paddingBottom: spacing[6],
  },
  statusCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    gap: spacing[2],
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  statusTitle: {
    ...typeStyles.bodyStrong,
  },
  statusCopy: {
    ...typeStyles.bodySmall,
  },
  actionCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    gap: spacing[3],
  },
  cardTitle: {
    ...typeStyles.bodyStrong,
  },
  cardCopy: {
    ...typeStyles.bodySmall,
  },
  outputText: {
    ...typeStyles.mono,
  },
  fallbackNote: {
    ...typeStyles.meta,
  },
  optionCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[2],
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  optionTitle: {
    ...typeStyles.bodyStrong,
    flex: 1,
  },
  optionDescription: {
    ...typeStyles.bodySmall,
  },
  primaryButton: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing[2],
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    ...typeStyles.bodyStrong,
  },
  secondaryButtonText: {
    ...typeStyles.bodyStrong,
  },
  tokenSection: {
    gap: spacing[3],
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  codeBox: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
  },
  codeText: {
    ...typeStyles.screenTitle,
    letterSpacing: 1.5,
  },
  debugHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  waitingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  debugHeaderText: {
    flex: 1,
    gap: spacing[1],
  },
  fallbackCodeCard: {
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[2],
  },
  fallbackLabel: {
    ...typeStyles.sectionTitle,
  },
  fallbackCodeText: {
    ...typeStyles.screenTitle,
    letterSpacing: 1.25,
  },
  successCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    gap: spacing[2],
  },
  successTitle: {
    ...typeStyles.bodyStrong,
  },
})
