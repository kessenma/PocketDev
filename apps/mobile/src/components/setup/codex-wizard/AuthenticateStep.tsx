import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, Image, TouchableOpacity, TextInput, Linking, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import Clipboard from '@react-native-clipboard/clipboard'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useConnectionStore } from '../../../stores/connection'
import { fetchCodexAuthStatus, postStartCodexAuth, postSubmitCodexAuth } from '../../../services/api'
import { Assets } from '../../../../assets'
import { Copy, ExternalLink, RefreshCw, Send, ShieldCheck, Smartphone, Globe } from 'lucide-react-native'
import type { CodexAuthSessionStatus } from '@pocketdev/shared/types'

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'authenticate'; authSession?: CodexAuthSessionStatus | null }
  | { type: 'STEP_FAILED'; step: 'authenticate'; error: string }
  | { type: 'SET_AUTH_SESSION'; authSession: CodexAuthSessionStatus | null }

interface Props {
  dispatch: (action: WizardAction) => void
  authSession: CodexAuthSessionStatus | null
}

export default function AuthenticateStep({ dispatch, authSession }: Props) {
  const { colors, isDark } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const [session, setSession] = useState<CodexAuthSessionStatus | null>(authSession)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [openedBrowser, setOpenedBrowser] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const syncSession = useCallback((next: CodexAuthSessionStatus) => {
    setSession(next)
    dispatch({ type: 'SET_AUTH_SESSION', authSession: next })
  }, [dispatch])

  const startSession = useCallback(async () => {
    if (!server) return
    setLoading(true)
    setError(null)
    try {
      const next = await postStartCodexAuth(server.ip, server.port)
      syncSession(next)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start Codex authentication.'
      setError(message)
      dispatch({ type: 'STEP_FAILED', step: 'authenticate', error: message })
    } finally {
      setLoading(false)
    }
  }, [dispatch, server, syncSession])

  useEffect(() => {
    if (!session && !loading) {
      void startSession()
    }
  }, [loading, session, startSession])

  useEffect(() => {
    if (!server || !session?.session_id || session.completed) return
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
  }, [dispatch, server, session, syncSession])

  const handleOpenBrowser = useCallback(() => {
    if (!session?.auth_url) return
    Linking.openURL(session.auth_url)
    setOpenedBrowser(true)
  }, [session])

  const handleSubmit = useCallback(async () => {
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

  const handleChooseMethod = useCallback(async (choice: '1' | '2') => {
    if (!server || !session?.session_id) return
    setLoading(true)
    setError(null)
    try {
      const next = await postSubmitCodexAuth(server.ip, server.port, session.session_id, choice)
      syncSession(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to choose a Codex sign-in method.')
    } finally {
      setLoading(false)
    }
  }, [server, session, syncSession])

  function handleCopyCode() {
    if (!session?.verification_code) return
    Clipboard.setString(session.verification_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const phaseDescription =
    session?.authenticated
      ? 'Codex sign-in completed. Continue to verify the CLI and sync the cached provider state.'
      : session?.state === 'awaiting_choice'
        ? 'Choose how you want to sign in. ChatGPT opens a browser flow; Device Code lets you continue from another device.'
      : session?.state === 'awaiting_code'
        ? 'Finish the browser flow, then paste any one-time code here if Codex asks for it.'
        : session?.state === 'awaiting_browser'
          ? 'Open the OpenAI sign-in page in your browser to continue.'
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
            PocketDev keeps the sign-in flow guided and then updates the stored Codex auth state after verification.
          </Text>
        </View>

        <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.statusHeader}>
            <ShieldCheck color={session?.authenticated ? '#22c55e' : colors.primary} size={18} strokeWidth={2.25} />
            <Text style={[styles.statusTitle, { color: colors.text }]}>
              {session?.authenticated ? 'Signed in' : 'OpenAI sign-in'}
            </Text>
          </View>
          <Text style={[styles.statusCopy, { color: session?.state === 'failed' ? colors.error : colors.textSecondary }]}>
            {error ?? phaseDescription}
          </Text>
          {session?.prompt && (
            <Text style={[styles.promptText, { color: colors.textTertiary }]}>
              Latest prompt: {session.prompt}
            </Text>
          )}
        </View>

        {session?.state === 'awaiting_choice' && (
          <View style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Choose sign-in method</Text>
            <Text style={[styles.cardCopy, { color: colors.textSecondary }]}>
              API key setup is intentionally omitted here. Pick one of the supported interactive login methods.
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={() => void handleChooseMethod('1')}
              activeOpacity={0.7}
            >
              <Globe color={colors.primaryText} size={18} strokeWidth={2.25} />
              <Text style={[styles.buttonText, { color: colors.primaryText }]}>Sign in with ChatGPT</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={() => void handleChooseMethod('2')}
              activeOpacity={0.7}
            >
              <Smartphone color={colors.text} size={18} strokeWidth={2.25} />
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Use Device Code</Text>
            </TouchableOpacity>
          </View>
        )}

        {session?.auth_url && (
          <View style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Browser step</Text>
            <Text style={[styles.cardCopy, { color: colors.textSecondary }]}>
              Open the OpenAI page on this device or another browser, then return here once the flow continues.
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
          </View>
        )}

        {session?.verification_code && (
          <View style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Verification code</Text>
            <Text style={[styles.cardCopy, { color: colors.textSecondary }]}>
              If OpenAI shows a device-code prompt, use this code.
            </Text>
            <View style={[styles.codeBox, { backgroundColor: colors.background }]}>
              <Text style={[styles.codeText, { color: colors.text }]} selectable>
                {session.verification_code}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: copied ? '#22c55e' : colors.border }]}
              onPress={handleCopyCode}
              activeOpacity={0.7}
            >
              <Copy color={copied ? '#22c55e' : colors.text} size={16} strokeWidth={2.25} />
              <Text style={[styles.secondaryButtonText, { color: copied ? '#22c55e' : colors.text }]}>
                {copied ? 'Copied' : 'Copy code'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {(session?.can_submit_code || openedBrowser) && !session?.authenticated && session?.state !== 'awaiting_choice' && (
          <View style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Manual code entry</Text>
            <Text style={[styles.cardCopy, { color: colors.textSecondary }]}>
              Only use this if Codex CLI asks you to paste a code back into the session.
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
                onPress={handleSubmit}
                disabled={!input.trim() || loading}
                activeOpacity={0.7}
              >
                <Send color={colors.primaryText} size={16} strokeWidth={2.25} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {session?.output_excerpt && (
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

      {!session?.authenticated && (
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          onPress={() => void startSession()}
          activeOpacity={0.7}
        >
          <RefreshCw color={colors.primaryText} size={18} strokeWidth={2.25} />
          <Text style={[styles.buttonText, { color: colors.primaryText }]}>
            {session?.state === 'failed' ? 'Restart sign-in' : 'Restart auth session'}
          </Text>
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
  buttonText: {
    ...typographyScale.base,
    fontWeight: '600',
  },
  secondaryButtonText: {
    ...typographyScale.sm,
    fontWeight: '600',
  },
})
