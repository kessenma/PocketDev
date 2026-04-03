import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, Image, TouchableOpacity, TextInput, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Linking } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useConnectionStore } from '../../../stores/connection'
import {
  fetchCodexAuthStatus,
  postReplayCodexAuthCallback,
  postStartCodexAuth,
  postSubmitCodexAuth,
} from '../../../services/api'
import { Assets } from '../../../../assets'
import { ExternalLink, RefreshCw, Send, ShieldCheck, Smartphone, Globe, Circle, CircleDot } from 'lucide-react-native'
import type { CodexAuthSessionStatus } from '@pocketdev/shared/types'
import CopyButton from '../../shared/CopyButton'

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'authenticate'; authSession?: CodexAuthSessionStatus | null }
  | { type: 'STEP_FAILED'; step: 'authenticate'; error: string }
  | { type: 'SET_AUTH_SESSION'; authSession: CodexAuthSessionStatus | null }

interface Props {
  dispatch: (action: WizardAction) => void
  authSession: CodexAuthSessionStatus | null
}

type Method = 'browser' | 'device_code'

export default function AuthenticateStep({ dispatch, authSession }: Props) {
  const { colors, isDark } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const [session, setSession] = useState<CodexAuthSessionStatus | null>(authSession)
  const [selectedMethod, setSelectedMethod] = useState<Method>('device_code')
  const [input, setInput] = useState('')
  const [callbackUrl, setCallbackUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [started, setStarted] = useState(false)
  const [openedBrowser, setOpenedBrowser] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const syncSession = useCallback((next: CodexAuthSessionStatus) => {
    setSession(next)
    dispatch({ type: 'SET_AUTH_SESSION', authSession: next })
  }, [dispatch])

  const resetFlow = useCallback(() => {
    setSession(null)
    setStarted(false)
    setOpenedBrowser(false)
    setInput('')
    setCallbackUrl('')
    setError(null)
    dispatch({ type: 'SET_AUTH_SESSION', authSession: null })
  }, [dispatch])

  const startSession = useCallback(async (mode: Method) => {
    if (!server) return
    setLoading(true)
    setError(null)
    setInput('')
    setCallbackUrl('')
    setOpenedBrowser(false)
    try {
      const next = await postStartCodexAuth(server.ip, server.port, mode)
      syncSession(next)
      setStarted(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start Codex authentication.'
      setError(message)
      dispatch({ type: 'STEP_FAILED', step: 'authenticate', error: message })
    } finally {
      setLoading(false)
    }
  }, [dispatch, server, syncSession])

  useEffect(() => {
    if (!server || !started || !session?.session_id || session.completed) return
    const timer = setInterval(() => {
      void (async () => {
        try {
          const next = await fetchCodexAuthStatus(server.ip, server.port, session.session_id)
          syncSession(next)
          if (next.authenticated) {
            dispatch({ type: 'STEP_COMPLETE', step: 'authenticate', authSession: next })
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to refresh Codex auth status.'
          setError(message)
        }
      })()
    }, 1500)

    return () => clearInterval(timer)
  }, [dispatch, server, session, started, syncSession])

  const handleOpenBrowser = useCallback(() => {
    if (!session?.auth_url) return
    Linking.openURL(session.auth_url)
    setOpenedBrowser(true)
  }, [session])

  const handleSubmitCode = useCallback(async () => {
    if (!server || !session?.session_id || !input.trim()) return
    setLoading(true)
    setError(null)
    try {
      const next = await postSubmitCodexAuth(server.ip, server.port, session.session_id, input.trim())
      setInput('')
      syncSession(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit the authentication code.')
    } finally {
      setLoading(false)
    }
  }, [input, server, session, syncSession])

  const handleReplayCallback = useCallback(async () => {
    if (!server || !session?.session_id || !callbackUrl.trim()) return
    setLoading(true)
    setError(null)
    try {
      const replay = await postReplayCodexAuthCallback(server.ip, server.port, session.session_id, callbackUrl.trim())
      if (!replay.success) {
        setError(replay.error ?? 'Failed to complete Codex auth callback.')
        return
      }
      const next = await fetchCodexAuthStatus(server.ip, server.port, session.session_id)
      syncSession(next)
      if (next.authenticated) {
        dispatch({ type: 'STEP_COMPLETE', step: 'authenticate', authSession: next })
      } else if (next.state === 'failed') {
        const message = next.error ?? 'Codex authentication failed.'
        setError(message)
        dispatch({ type: 'STEP_FAILED', step: 'authenticate', error: message })
      }
      setCallbackUrl('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete Codex auth callback.')
    } finally {
      setLoading(false)
    }
  }, [callbackUrl, server, session])

  const helperText = !started
    ? 'Choose how you want to authenticate before PocketDev starts the Codex login flow on your server.'
    : session?.authenticated
      ? 'Codex sign-in completed. Continue to verify the CLI and sync the cached provider state.'
      : session?.state === 'awaiting_code'
        ? selectedMethod === 'device_code'
          ? 'Open the verification page, then enter the one-time code shown by Codex if the CLI asks for it.'
          : 'Complete sign-in in your browser or ChatGPT app, then finish the localhost callback handoff in PocketDev.'
        : session?.state === 'awaiting_browser'
          ? selectedMethod === 'device_code'
            ? 'Open the verification page in your browser or ChatGPT app and complete sign-in with the code below.'
            : 'Open the sign-in page in your system browser, then paste the returned localhost callback URL back into PocketDev.'
          : session?.state === 'pending'
            ? 'Waiting for Codex CLI to finish the authentication flow.'
            : session?.state === 'failed'
              ? (session.error ?? 'Codex authentication failed.')
              : 'Starting the authentication flow on your server.'

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={120}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image
            source={isDark ? Assets.codexWhite : Assets.codexBlack}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: colors.text }]}>Authenticate Codex</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Choose a mobile-friendly sign-in path, then PocketDev will verify and sync the stored Codex auth state.
          </Text>
        </View>

        <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.statusHeader}>
            <ShieldCheck color={session?.authenticated ? '#22c55e' : colors.primary} size={18} strokeWidth={2.25} />
            <Text style={[styles.statusTitle, { color: colors.text }]}>
              {session?.authenticated ? 'Signed in' : 'OpenAI sign-in'}
            </Text>
          </View>
          <Text style={[styles.statusCopy, { color: error || session?.state === 'failed' ? colors.error : colors.textSecondary }]}>
            {error ?? helperText}
          </Text>
          {session?.prompt && (
            <Text style={[styles.promptText, { color: colors.textTertiary }]}>
              Latest prompt: {session.prompt}
            </Text>
          )}
        </View>

        {!started && (
          <View style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Login and authenticate with</Text>
            <MethodOption
              label="web app"
              description="Start `codex login`, finish sign-in in your system browser, then paste the localhost callback URL back into PocketDev."
              selected={selectedMethod === 'browser'}
              onPress={() => setSelectedMethod('browser')}
              colors={colors}
              icon={<Globe color={selectedMethod === 'browser' ? colors.primary : colors.textTertiary} size={18} strokeWidth={2.25} />}
            />
            <MethodOption
              label="ChatGPT app"
              description="Start `codex login --device-auth`, then use the verification page and one-time code in the ChatGPT app or another browser on your phone."
              selected={selectedMethod === 'device_code'}
              onPress={() => setSelectedMethod('device_code')}
              colors={colors}
              icon={<Smartphone color={selectedMethod === 'device_code' ? colors.primary : colors.textTertiary} size={18} strokeWidth={2.25} />}
            />
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={() => void startSession(selectedMethod)}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, { color: colors.primaryText }]}>
                Continue with {selectedMethod === 'browser' ? 'web app' : 'ChatGPT app'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {started && session?.auth_url && (
          <View style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {selectedMethod === 'device_code' ? 'Verification page' : 'System browser step'}
            </Text>
            <Text style={[styles.cardCopy, { color: colors.textSecondary }]}>
              {selectedMethod === 'device_code'
                ? 'Open the OpenAI verification page in the ChatGPT app or your mobile browser, then complete sign-in with the one-time code shown below.'
                : 'Open the OpenAI page in your system browser. After sign-in, copy the final `localhost:1455/auth/callback?...` URL and paste it back into PocketDev so the server can finish Codex authentication.'}
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={handleOpenBrowser}
              activeOpacity={0.7}
            >
              <ExternalLink color={colors.primaryText} size={18} strokeWidth={2.25} />
              <Text style={[styles.buttonText, { color: colors.primaryText }]}>
                {openedBrowser ? 'Re-open browser' : selectedMethod === 'device_code' ? 'Open verification page' : 'Open sign-in in browser'}
              </Text>
            </TouchableOpacity>
            <CopyButton value={session.auth_url} label="Copy URL" />
          </View>
        )}

        {started && selectedMethod === 'device_code' && session?.verification_code && (
          <View style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Verification code</Text>
            <Text style={[styles.cardCopy, { color: colors.textSecondary }]}>
              Enter this one-time code after opening the verification page in the ChatGPT app or your browser.
            </Text>
            <View style={[styles.codeBox, { backgroundColor: colors.background }]}>
              <Text style={[styles.codeText, { color: colors.text }]} selectable>
                {session.verification_code}
              </Text>
            </View>
            <CopyButton value={session.verification_code} label="Copy code" />
          </View>
        )}

        {started && selectedMethod === 'browser' && openedBrowser && !session?.authenticated && (
          <View style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Paste callback URL</Text>
            <Text style={[styles.cardCopy, { color: colors.textSecondary }]}>
              After the browser finishes signing you in, copy the URL that starts with `localhost:1455/auth/callback?` or `http://localhost:1455/auth/callback?` and paste it here.
            </Text>
            <TextInput
              style={[styles.multilineInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              value={callbackUrl}
              onChangeText={setCallbackUrl}
              placeholder="localhost:1455/auth/callback?..."
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
            />
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: callbackUrl.trim() ? colors.primary : colors.border }]}
              onPress={() => void handleReplayCallback()}
              disabled={!callbackUrl.trim() || loading}
              activeOpacity={0.7}
            >
              <Send color={colors.primaryText} size={18} strokeWidth={2.25} />
              <Text style={[styles.buttonText, { color: colors.primaryText }]}>Finish sign-in</Text>
            </TouchableOpacity>
          </View>
        )}

        {started && selectedMethod === 'device_code' && session?.can_submit_code && !session?.authenticated && (
          <View style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Manual code entry</Text>
            <Text style={[styles.cardCopy, { color: colors.textSecondary }]}>
              Only use this if Codex CLI asks you to paste a one-time code back into the session.
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={input}
                onChangeText={setInput}
                placeholder="Paste code here"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.sendButton, { backgroundColor: input.trim() ? colors.primary : colors.border }]}
                onPress={() => void handleSubmitCode()}
                disabled={!input.trim() || loading}
                activeOpacity={0.7}
              >
                <Send color={colors.primaryText} size={16} strokeWidth={2.25} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {started && session?.output_excerpt && (
          <View style={[styles.outputCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Recent Codex output</Text>
            <View style={[styles.outputBox, { backgroundColor: colors.background }]}>
              <Text style={[styles.outputText, { color: colors.textSecondary }]} selectable>
                {session.output_excerpt}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footerActions}>
        {!session?.authenticated && started && (
          <TouchableOpacity
            style={[styles.secondaryFooterButton, { borderColor: colors.border }]}
            onPress={resetFlow}
            activeOpacity={0.7}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Change method</Text>
          </TouchableOpacity>
        )}
        {!session?.authenticated && (
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={() => void startSession(selectedMethod)}
            activeOpacity={0.7}
          >
            <RefreshCw color={colors.primaryText} size={18} strokeWidth={2.25} />
            <Text style={[styles.buttonText, { color: colors.primaryText }]}>
              {started ? 'Restart auth session' : 'Start sign-in'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
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
          backgroundColor: selected ? colors.primary + '12' : colors.background,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.methodTopRow}>
        <View style={styles.methodTitleRow}>
          {selected
            ? <CircleDot color={colors.primary} size={18} strokeWidth={2.25} />
            : <Circle color={colors.textTertiary} size={18} strokeWidth={2.25} />}
          {icon}
          <Text style={[styles.methodLabel, { color: colors.text }]}>{label}</Text>
        </View>
      </View>
      <Text style={[styles.methodDescription, { color: colors.textSecondary }]}>{description}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing[3],
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
    ...typographyScale.xl,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    ...typographyScale.sm,
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
    ...typographyScale.base,
    fontWeight: '700',
  },
  statusCopy: {
    ...typographyScale.sm,
    lineHeight: 20,
  },
  promptText: {
    ...typographyScale.xs,
    lineHeight: 18,
  },
  actionCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[3],
  },
  outputCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[2],
  },
  cardTitle: {
    ...typographyScale.base,
    fontWeight: '700',
  },
  cardCopy: {
    ...typographyScale.sm,
    lineHeight: 20,
  },
  methodOption: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[2],
  },
  methodTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  methodTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  methodLabel: {
    ...typographyScale.base,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  methodDescription: {
    ...typographyScale.sm,
    lineHeight: 20,
  },
  codeBox: {
    borderRadius: borderRadius.md,
    padding: spacing[3],
  },
  codeText: {
    ...typographyScale.lg,
    fontWeight: '700',
    letterSpacing: 1.5,
    textAlign: 'center',
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
    paddingVertical: spacing[3],
    ...typographyScale.sm,
    fontFamily: 'monospace',
  },
  multilineInput: {
    minHeight: 110,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    ...typographyScale.sm,
    fontFamily: 'monospace',
    textAlignVertical: 'top',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outputBox: {
    borderRadius: borderRadius.md,
    padding: spacing[3],
  },
  outputText: {
    ...typographyScale.xs,
    fontFamily: 'monospace',
  },
  footerActions: {
    gap: spacing[2],
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing[3],
  },
  secondaryFooterButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
  },
  buttonText: {
    ...typographyScale.base,
    fontWeight: '600',
  },
  secondaryButtonText: {
    ...typographyScale.sm,
    fontWeight: '600',
  },
})
