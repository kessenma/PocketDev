import React, { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, Image, TouchableOpacity, TextInput, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Linking, AppState } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius } from '@pocketdev/shared/theme'
import { typeStyles } from '../../../theme/typography'
import { useConnectionStore } from '../../../stores/connection'
import {
  postStartOpenAIOpenCodeAuth,
  fetchOpenAIOpenCodeAuthStatus,
  postOpenAIOpenCodeAuthCallback,
} from '../../../services/api'
import { Assets } from '../../../../assets'
import { ExternalLink, RefreshCw, Send, ShieldCheck, Globe, Smartphone, Key, Circle, CircleDot } from 'lucide-react-native'
import type { OpenAIOpenCodeAuthMethod, OpenAIOpenCodeAuthSessionStatus } from '@pocketdev/shared/types'
import CopyButton from '../../ui/CopyButton'

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'authenticate' }
  | { type: 'STEP_FAILED'; step: 'authenticate'; error: string }
  | { type: 'SET_AUTH_SESSION'; authSession: OpenAIOpenCodeAuthSessionStatus | null }

interface Props {
  dispatch: (action: WizardAction) => void
  authSession: OpenAIOpenCodeAuthSessionStatus | null
}

export default function AuthenticateStep({ dispatch, authSession }: Props) {
  const { colors, isDark } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const [session, setSession] = useState<OpenAIOpenCodeAuthSessionStatus | null>(authSession)
  const [selectedMethod, setSelectedMethod] = useState<OpenAIOpenCodeAuthMethod>('browser')
  const [apiKey, setApiKey] = useState('')
  const [callbackUrl, setCallbackUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [openedBrowser, setOpenedBrowser] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const appStateRef = useRef(AppState.currentState)

  const syncSession = useCallback((next: OpenAIOpenCodeAuthSessionStatus) => {
    setSession(next)
    dispatch({ type: 'SET_AUTH_SESSION', authSession: next })
  }, [dispatch])

  const resetFlow = useCallback(() => {
    setSession(null)
    setOpenedBrowser(false)
    setApiKey('')
    setCallbackUrl('')
    setError(null)
    dispatch({ type: 'SET_AUTH_SESSION', authSession: null })
  }, [dispatch])

  // Polling when session is active and not terminal
  useEffect(() => {
    if (!server || !session?.session_id) return
    if (session.authenticated || session.state === 'failed') return
    if (session.method === 'browser' && session.state === 'awaiting_browser') return // wait for manual callback

    const timer = setInterval(() => {
      void (async () => {
        try {
          const next = await fetchOpenAIOpenCodeAuthStatus(server.ip, server.port, session.session_id)
          syncSession(next)
          if (next.authenticated) {
            dispatch({ type: 'STEP_COMPLETE', step: 'authenticate' })
          } else if (next.state === 'failed') {
            const msg = next.error ?? 'Authentication failed.'
            setError(msg)
            dispatch({ type: 'STEP_FAILED', step: 'authenticate', error: msg })
          }
        } catch {
          // network error, keep polling
        }
      })()
    }, 2500)

    return () => clearInterval(timer)
  }, [dispatch, server, session, syncSession])

  // AppState listener for browser mode — refresh when app comes back to foreground
  useEffect(() => {
    if (session?.method !== 'browser') return
    const sub = AppState.addEventListener('change', (next) => {
      if (appStateRef.current.match(/inactive|background/) && next === 'active') {
        if (server && session?.session_id && !session.authenticated) {
          void fetchOpenAIOpenCodeAuthStatus(server.ip, server.port, session.session_id).then(syncSession).catch(() => {})
        }
      }
      appStateRef.current = next
    })
    return () => sub.remove()
  }, [server, session, syncSession])

  const startSession = useCallback(async (method: OpenAIOpenCodeAuthMethod) => {
    if (!server) return
    setLoading(true)
    setError(null)
    setCallbackUrl('')
    setOpenedBrowser(false)
    try {
      const key = method === 'api_key' ? apiKey.trim() : undefined
      if (method === 'api_key' && !key) {
        setError('Please enter your OpenAI API key.')
        return
      }
      const next = await postStartOpenAIOpenCodeAuth(server.ip, server.port, method, key)
      syncSession(next)
      if (next.authenticated) {
        dispatch({ type: 'STEP_COMPLETE', step: 'authenticate' })
      } else if (next.state === 'failed') {
        const msg = next.error ?? 'Failed to start authentication.'
        setError(msg)
        dispatch({ type: 'STEP_FAILED', step: 'authenticate', error: msg })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start authentication.'
      setError(msg)
      dispatch({ type: 'STEP_FAILED', step: 'authenticate', error: msg })
    } finally {
      setLoading(false)
    }
  }, [apiKey, dispatch, server, syncSession])

  const handleOpenBrowser = useCallback(() => {
    const url = session?.auth_url ?? session?.verification_url
    if (!url) return
    Linking.openURL(url)
    setOpenedBrowser(true)
  }, [session])

  const handleSubmitCallback = useCallback(async () => {
    if (!server || !session?.session_id || !callbackUrl.trim()) return
    setLoading(true)
    setError(null)
    try {
      const next = await postOpenAIOpenCodeAuthCallback(server.ip, server.port, session.session_id, callbackUrl.trim())
      syncSession(next)
      if (next.authenticated) {
        dispatch({ type: 'STEP_COMPLETE', step: 'authenticate' })
      } else {
        const msg = next.error ?? 'Callback processed but authentication not confirmed.'
        setError(msg)
        if (next.state === 'failed') {
          dispatch({ type: 'STEP_FAILED', step: 'authenticate', error: msg })
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit callback URL.')
    } finally {
      setLoading(false)
    }
  }, [callbackUrl, dispatch, server, session, syncSession])

  const hasSession = !!session
  const isWaiting = hasSession && !session.authenticated && session.state !== 'failed'
  const isFailed = session?.state === 'failed'

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
          <Text style={[styles.title, { color: colors.text }]}>Sign in to OpenAI</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Choose how to authenticate your OpenAI account in opencode.
          </Text>
        </View>

        {(error || isFailed) && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.error }]}>
            <ShieldCheck color={colors.error} size={18} strokeWidth={2.25} />
            <Text style={[styles.errorText, { color: colors.error }]}>{error ?? session?.error}</Text>
          </View>
        )}

        {!hasSession && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Sign in with</Text>
            <MethodOption
              label="Browser (ChatGPT Pro/Plus)"
              description="Open the OpenAI sign-in page, complete authentication, then paste the callback URL back here."
              selected={selectedMethod === 'browser'}
              onPress={() => setSelectedMethod('browser')}
              colors={colors}
              icon={<Globe color={selectedMethod === 'browser' ? colors.primary : colors.textTertiary} size={18} strokeWidth={2.25} />}
            />
            <MethodOption
              label="Headless (device code)"
              description="Visit https://auth.openai.com/codex/device and enter the one-time code. Requires device code authorization enabled in ChatGPT Security Settings."
              selected={selectedMethod === 'headless'}
              onPress={() => setSelectedMethod('headless')}
              colors={colors}
              icon={<Smartphone color={selectedMethod === 'headless' ? colors.primary : colors.textTertiary} size={18} strokeWidth={2.25} />}
            />
            <MethodOption
              label="API Key"
              description="Manually enter an OpenAI API key. It will be stored in opencode's auth file."
              selected={selectedMethod === 'api_key'}
              onPress={() => setSelectedMethod('api_key')}
              colors={colors}
              icon={<Key color={selectedMethod === 'api_key' ? colors.primary : colors.textTertiary} size={18} strokeWidth={2.25} />}
            />

            {selectedMethod === 'api_key' && (
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={apiKey}
                onChangeText={setApiKey}
                placeholder="sk-..."
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />
            )}

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={() => void startSession(selectedMethod)}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, { color: colors.primaryText }]}>
                {loading ? 'Starting…' : selectedMethod === 'browser' ? 'Open sign-in' : selectedMethod === 'headless' ? 'Get code' : 'Save API key'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Browser mode: show auth URL + callback input */}
        {hasSession && session.method === 'browser' && session.state === 'awaiting_browser' && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Open sign-in in browser</Text>
            <Text style={[styles.cardCopy, { color: colors.textSecondary }]}>
              After completing sign-in, copy the full callback URL (starts with{' '}
              <Text style={{ fontFamily: 'monospace' }}>localhost:</Text>) and paste it below.
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={handleOpenBrowser}
              activeOpacity={0.7}
            >
              <ExternalLink color={colors.primaryText} size={18} strokeWidth={2.25} />
              <Text style={[styles.buttonText, { color: colors.primaryText }]}>
                {openedBrowser ? 'Re-open browser' : 'Open sign-in page'}
              </Text>
            </TouchableOpacity>
            {session.auth_url && <CopyButton value={session.auth_url} label="Copy sign-in URL" />}

            <Text style={[styles.cardTitle, { color: colors.text }]}>Paste callback URL</Text>
            <TextInput
              style={[styles.multilineInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              value={callbackUrl}
              onChangeText={setCallbackUrl}
              placeholder="localhost:..."
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
            />
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: callbackUrl.trim() ? colors.primary : colors.border }]}
              onPress={() => void handleSubmitCallback()}
              disabled={!callbackUrl.trim() || loading}
              activeOpacity={0.7}
            >
              <Send color={colors.primaryText} size={18} strokeWidth={2.25} />
              <Text style={[styles.buttonText, { color: colors.primaryText }]}>
                {loading ? 'Verifying…' : 'Complete sign-in'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Headless mode: show verification URL + user code */}
        {hasSession && session.method === 'headless' && session.verification_url && session.user_code && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Open verification page</Text>
            <Text style={[styles.cardCopy, { color: colors.textSecondary }]}>
              Go to the URL below and enter the code. Device code authorization must be enabled in your ChatGPT Security Settings.
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={handleOpenBrowser}
              activeOpacity={0.7}
            >
              <ExternalLink color={colors.primaryText} size={18} strokeWidth={2.25} />
              <Text style={[styles.buttonText, { color: colors.primaryText }]}>
                {openedBrowser ? 'Re-open page' : 'Open verification page'}
              </Text>
            </TouchableOpacity>
            <CopyButton value={session.verification_url} label="Copy URL" />

            <Text style={[styles.cardTitle, { color: colors.text }]}>Your code</Text>
            <View style={[styles.codeBox, { backgroundColor: colors.background }]}>
              <Text style={[styles.codeText, { color: colors.text }]} selectable>
                {session.user_code}
              </Text>
            </View>
            <CopyButton value={session.user_code} label="Copy code" />
            <Text style={[styles.waitingText, { color: colors.textTertiary }]}>
              Waiting for you to enter the code…
            </Text>
          </View>
        )}

        {/* Polling / pending state */}
        {isWaiting && session.method !== 'browser' && !session.user_code && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardCopy, { color: colors.textSecondary }]}>
              {session.state === 'pending' ? 'Waiting for authentication to complete…' : 'Starting authentication…'}
            </Text>
          </View>
        )}

        {/* Authenticated */}
        {session?.authenticated && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ShieldCheck color="#22c55e" size={18} strokeWidth={2.25} />
            <Text style={[styles.cardTitle, { color: '#22c55e' }]}>Signed in successfully</Text>
          </View>
        )}
      </ScrollView>

      {hasSession && !session.authenticated && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.border }]}
            onPress={resetFlow}
            activeOpacity={0.7}
          >
            <RefreshCw color={colors.text} size={16} strokeWidth={2.25} />
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Change method</Text>
          </TouchableOpacity>
        </View>
      )}
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
      <View style={styles.methodTitleRow}>
        {selected
          ? <CircleDot color={colors.primary} size={18} strokeWidth={2.25} />
          : <Circle color={colors.textTertiary} size={18} strokeWidth={2.25} />}
        {icon}
        <Text style={[styles.methodLabel, { color: colors.text }]}>{label}</Text>
      </View>
      <Text style={[styles.methodDescription, { color: colors.textSecondary }]}>{description}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { gap: spacing[3], paddingBottom: spacing[4] },
  hero: {
    alignItems: 'center',
    gap: spacing[2],
    paddingTop: spacing[4],
  },
  logo: { width: 42, height: 42 },
  title: { ...typeStyles.heading, textAlign: 'center' },
  subtitle: { ...typeStyles.bodySmall, textAlign: 'center' },
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[3],
  },
  cardTitle: { ...typeStyles.bodyBold },
  cardCopy: { ...typeStyles.bodySmall },
  errorText: { ...typeStyles.bodySmall, flex: 1 },
  methodOption: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[2],
  },
  methodTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  methodLabel: { ...typeStyles.bodyBold },
  methodDescription: { ...typeStyles.bodySmall },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    ...typeStyles.mono,
  },
  multilineInput: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    ...typeStyles.mono,
    textAlignVertical: 'top',
  },
  codeBox: {
    borderRadius: borderRadius.md,
    padding: spacing[3],
    alignItems: 'center',
  },
  codeText: {
    ...typeStyles.heading,
    letterSpacing: 4,
  },
  waitingText: { ...typeStyles.meta, textAlign: 'center' },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
  },
  buttonText: { ...typeStyles.button },
  footer: { gap: spacing[2] },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
  },
  secondaryButtonText: { ...typeStyles.bodySmall },
})
