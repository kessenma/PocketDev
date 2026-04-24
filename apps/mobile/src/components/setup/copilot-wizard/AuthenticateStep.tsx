import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking, AppState, Image } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius } from '@pocketdev/shared/theme'
import { typeStyles } from '../../../theme/typography'
import { useConnectionStore } from '../../../stores/connection'
import {
  postStartCopilotOpenCodeAuth,
  fetchCopilotOpenCodeAuthStatus,
} from '../../../services/api'
import { Assets } from '../../../../assets'
import { ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react-native'
import type { CopilotOpenCodeAuthSessionStatus } from '@pocketdev/shared/types'
import CopyButton from '../../shared/CopyButton'

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'authenticate' }
  | { type: 'STEP_FAILED'; step: 'authenticate'; error: string }
  | { type: 'SET_AUTH_SESSION'; authSession: CopilotOpenCodeAuthSessionStatus | null }

interface Props {
  dispatch: (action: WizardAction) => void
  authSession: CopilotOpenCodeAuthSessionStatus | null
}

export default function AuthenticateStep({ dispatch, authSession }: Props) {
  const { colors, isDark } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const [session, setSession] = useState<CopilotOpenCodeAuthSessionStatus | null>(authSession)
  const [loading, setLoading] = useState(false)
  const [openedBrowser, setOpenedBrowser] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const appStateRef = useRef(AppState.currentState)

  const syncSession = useCallback((next: CopilotOpenCodeAuthSessionStatus) => {
    setSession(next)
    dispatch({ type: 'SET_AUTH_SESSION', authSession: next })
  }, [dispatch])

  const resetFlow = useCallback(() => {
    setSession(null)
    setOpenedBrowser(false)
    setError(null)
    dispatch({ type: 'SET_AUTH_SESSION', authSession: null })
  }, [dispatch])

  // Poll when session is active
  useEffect(() => {
    if (!server || !session?.session_id) return
    if (session.authenticated || session.state === 'failed') return

    const timer = setInterval(() => {
      void (async () => {
        try {
          const next = await fetchCopilotOpenCodeAuthStatus(server.ip, server.port, session.session_id)
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

  // AppState: refresh when app comes back to foreground
  useEffect(() => {
    if (!session?.session_id) return
    const sub = AppState.addEventListener('change', (next) => {
      if (appStateRef.current.match(/inactive|background/) && next === 'active') {
        if (server && session && !session.authenticated) {
          void fetchCopilotOpenCodeAuthStatus(server.ip, server.port, session.session_id).then(syncSession).catch(() => {})
        }
      }
      appStateRef.current = next
    })
    return () => sub.remove()
  }, [server, session, syncSession])

  async function handleStart() {
    if (!server) return
    setLoading(true)
    setError(null)
    setOpenedBrowser(false)
    try {
      const next = await postStartCopilotOpenCodeAuth(server.ip, server.port)
      syncSession(next)
      if (next.state === 'failed') {
        const msg = next.error ?? 'Failed to start Copilot authentication.'
        setError(msg)
        dispatch({ type: 'STEP_FAILED', step: 'authenticate', error: msg })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start Copilot authentication.'
      setError(msg)
      dispatch({ type: 'STEP_FAILED', step: 'authenticate', error: msg })
    } finally {
      setLoading(false)
    }
  }

  function handleOpenBrowser() {
    const url = session?.verification_uri
    if (!url) return
    Linking.openURL(url)
    setOpenedBrowser(true)
  }

  const hasSession = !!session
  const isFailed = session?.state === 'failed'

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <Image
          source={isDark ? Assets.githubCopilotWhite : Assets.githubCopilotBlack}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={[styles.title, { color: colors.text }]}>Sign in to GitHub Copilot</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Authenticate your GitHub account in opencode using device code flow.
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
          <Text style={[styles.cardCopy, { color: colors.textSecondary }]}>
            A one-time code will be generated. Open the GitHub verification page and enter the code to complete sign-in.
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={() => void handleStart()}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={[styles.buttonText, { color: colors.primaryText }]}>
              {loading ? 'Starting…' : 'Get device code'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {hasSession && session.user_code && session.verification_uri && !session.authenticated && (
        <>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Your code</Text>
            <Text style={[styles.cardCopy, { color: colors.textSecondary }]}>
              Enter this code on the GitHub verification page.
            </Text>
            <View style={[styles.codeBox, { backgroundColor: colors.background }]}>
              <Text style={[styles.codeText, { color: colors.text }]} selectable>
                {session.user_code}
              </Text>
            </View>
            <CopyButton value={session.user_code} label="Copy code" />
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Open verification page</Text>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={handleOpenBrowser}
              activeOpacity={0.7}
            >
              <ExternalLink color={colors.primaryText} size={18} strokeWidth={2.25} />
              <Text style={[styles.buttonText, { color: colors.primaryText }]}>
                {openedBrowser ? 'Re-open GitHub' : 'Open GitHub'}
              </Text>
            </TouchableOpacity>
            <CopyButton value={session.verification_uri} label="Copy URL" />
            <Text style={[styles.waitingText, { color: colors.textTertiary }]}>
              Waiting for you to enter the code…
            </Text>
          </View>
        </>
      )}

      {hasSession && !session.authenticated && (
        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: colors.border }]}
          onPress={resetFlow}
          activeOpacity={0.7}
        >
          <RefreshCw color={colors.text} size={16} strokeWidth={2.25} />
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Restart</Text>
        </TouchableOpacity>
      )}

      {session?.authenticated && (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ShieldCheck color="#22c55e" size={18} strokeWidth={2.25} />
          <Text style={[styles.cardTitle, { color: '#22c55e' }]}>Signed in successfully</Text>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
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
