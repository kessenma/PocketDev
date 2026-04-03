import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, Image, TouchableOpacity, TextInput, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Linking } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useConnectionStore } from '../../../stores/connection'
import {
  fetchClaudeAuthStatus,
  postStartClaudeAuth,
  postSubmitClaudeAuth,
} from '../../../services/api'
import { Assets } from '../../../../assets'
import { ExternalLink, CheckCircle, RefreshCw, Send, ShieldCheck, ChevronDown } from 'lucide-react-native'
import CopyButton from '../../shared/CopyButton'
import type { ClaudeAuthSessionStatus } from '@pocketdev/shared/types'

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
  const [session, setSession] = useState<ClaudeAuthSessionStatus | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [openedBrowser, setOpenedBrowser] = useState(false)
  const [showOutput, setShowOutput] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ─── Start auth session on mount ──────────────────────────────────

  const startSession = useCallback(async () => {
    if (!server) return
    setLoading(true)
    setError(null)
    try {
      const next = await postStartClaudeAuth(server.ip, server.port)
      setSession(next)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start Claude authentication.'
      setError(message)
      dispatch({ type: 'STEP_FAILED', step: 'authenticate', error: message })
    } finally {
      setLoading(false)
    }
  }, [dispatch, server])

  useEffect(() => {
    if (!session && !loading) {
      void startSession()
    }
  }, [loading, session, startSession])

  // ─── Poll for status ──────────────────────────────────────────────

  useEffect(() => {
    if (!server || !session?.session_id || session.completed) return
    const timer = setInterval(() => {
      void (async () => {
        try {
          const next = await fetchClaudeAuthStatus(server.ip, server.port, session.session_id)
          setSession(next)
          if (next.authenticated) {
            dispatch({ type: 'STEP_COMPLETE', step: 'authenticate' })
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to check auth status.')
        }
      })()
    }, 1500)
    return () => clearInterval(timer)
  }, [dispatch, server, session])

  // ─── Handlers ─────────────────────────────────────────────────────

  const handleOpenBrowser = useCallback(() => {
    if (!session?.auth_url) return
    Linking.openURL(session.auth_url).catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to open the sign-in page.')
    })
    setOpenedBrowser(true)
  }, [session])

  const handleSubmitCode = useCallback(async () => {
    if (!server || !session?.session_id || !input.trim()) return
    setLoading(true)
    setError(null)
    try {
      const next = await postSubmitClaudeAuth(server.ip, server.port, session.session_id, input.trim())
      setInput('')
      setSession(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit code.')
    } finally {
      setLoading(false)
    }
  }, [input, server, session])

  const handleContinue = useCallback(() => {
    dispatch({ type: 'STEP_COMPLETE', step: 'authenticate' })
  }, [dispatch])

  // ─── Derived state ────────────────────────────────────────────────

  const phaseDescription =
    session?.authenticated
      ? 'Claude Code is signed in. Continue to verify.'
      : session?.state === 'awaiting_browser' || session?.state === 'awaiting_code'
        ? 'Complete the sign-in in the browser, then paste any code if prompted.'
        : session?.state === 'failed'
          ? (session.error ?? 'Claude authentication failed.')
          : 'Starting the sign-in flow on your server...'

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={120}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Image
            source={isDark ? Assets.claudeWhite : Assets.claudeBlack}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: colors.text }]}>Sign In to Anthropic</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Authenticate Claude CLI with your Anthropic account
          </Text>
        </View>

        {/* Status card */}
        <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: session?.authenticated ? '#22c55e' : colors.border }]}>
          <View style={styles.statusHeader}>
            {session?.authenticated ? (
              <CheckCircle color="#22c55e" size={18} strokeWidth={2.25} />
            ) : loading && !session ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <ShieldCheck color={colors.primary} size={18} strokeWidth={2.25} />
            )}
            <Text style={[styles.statusTitle, { color: colors.text }]}>
              {session?.authenticated ? 'Signed in' : loading && !session ? 'Starting...' : 'Anthropic sign-in'}
            </Text>
          </View>
          <Text style={[styles.statusCopy, { color: session?.state === 'failed' ? colors.error : colors.textSecondary }]}>
            {error ?? phaseDescription}
          </Text>
        </View>

        {/* Browser step */}
        {session?.auth_url && !session.authenticated && (
          <View style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Browser step</Text>
            <Text style={[styles.cardCopy, { color: colors.textSecondary }]}>
              Open the Anthropic sign-in page in your phone&apos;s default browser. In-app webviews are avoided because some providers block this sign-in flow.
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={handleOpenBrowser}
              activeOpacity={0.7}
            >
              <ExternalLink color={colors.primaryText} size={18} strokeWidth={2.25} />
              <Text style={[styles.buttonText, { color: colors.primaryText }]}>
                {openedBrowser ? 'Re-open in browser' : 'Open sign-in page'}
              </Text>
            </TouchableOpacity>
            <CopyButton value={session.auth_url} label="Copy URL" />
          </View>
        )}

        {/* Code entry — shown when Claude CLI asks for a code paste */}
        {session?.can_submit_code && !session.authenticated && (
          <View style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Paste code</Text>
            <Text style={[styles.cardCopy, { color: colors.textSecondary }]}>
              If prompted after signing in, paste the code here.
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={input}
                onChangeText={setInput}
                placeholder="Paste code here"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.sendButton, { backgroundColor: input.trim() ? colors.primary : colors.border }]}
                onPress={handleSubmitCode}
                disabled={!input.trim() || loading}
                activeOpacity={0.7}
              >
                <Send color={colors.primaryText} size={16} strokeWidth={2.25} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Output excerpt */}
        {session?.output_excerpt && (
          <>
            <TouchableOpacity
              style={[styles.outputToggle, { borderColor: colors.border }]}
              onPress={() => setShowOutput(!showOutput)}
              activeOpacity={0.7}
            >
              <Text style={[styles.outputToggleText, { color: colors.textTertiary }]}>
                Terminal output
              </Text>
              <ChevronDown color={colors.textTertiary} size={16} strokeWidth={2} />
            </TouchableOpacity>
            {showOutput && (
              <View style={[styles.outputBox, { backgroundColor: colors.background }]}>
                <Text style={[styles.outputText, { color: colors.textSecondary }]} selectable>
                  {session.output_excerpt}
                </Text>
                <CopyButton value={session.output_excerpt} label="Copy output" style={{ marginTop: spacing[2] }} />
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Bottom actions */}
      {session?.authenticated && (
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          onPress={handleContinue}
          activeOpacity={0.7}
        >
          <CheckCircle color={colors.primaryText} size={18} strokeWidth={2.25} />
          <Text style={[styles.buttonText, { color: colors.primaryText }]}>Continue</Text>
        </TouchableOpacity>
      )}

      {session?.state === 'failed' && (
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.error }]}
          onPress={() => { setSession(null); setError(null); setOpenedBrowser(false) }}
          activeOpacity={0.7}
        >
          <RefreshCw color="#fff" size={16} strokeWidth={2.25} />
          <Text style={[styles.buttonText, { color: '#fff' }]}>Restart sign-in</Text>
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
  actionCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[3],
  },
  cardTitle: {
    ...typographyScale.base,
    fontWeight: '700',
  },
  cardCopy: {
    ...typographyScale.sm,
    lineHeight: 20,
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
    borderRadius: borderRadius.md,
    padding: spacing[3],
  },
  outputText: {
    ...typographyScale.xs,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  primaryButton: {
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
