import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useConnectionStore } from '../../../stores/connection'
import { fetchCopilotTrustStatus, postStartCopilotTrust } from '../../../services/api'
import { CheckCircle, RefreshCw, ShieldCheck } from 'lucide-react-native'
import type { CopilotTrustSessionStatus } from '@pocketdev/shared/types'

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'trust'; trustSession?: CopilotTrustSessionStatus | null }
  | { type: 'STEP_FAILED'; step: 'trust'; error: string }
  | { type: 'SET_TRUST_SESSION'; trustSession: CopilotTrustSessionStatus | null }

interface Props {
  dispatch: (action: WizardAction) => void
  trustSession: CopilotTrustSessionStatus | null
}

export default function TrustStep({ dispatch, trustSession }: Props) {
  const { colors } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const [session, setSession] = useState<CopilotTrustSessionStatus | null>(trustSession)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const syncSession = useCallback((next: CopilotTrustSessionStatus) => {
    setSession(next)
    dispatch({ type: 'SET_TRUST_SESSION', trustSession: next })
    if (next.trusted) {
      dispatch({ type: 'STEP_COMPLETE', step: 'trust', trustSession: next })
    }
    if (next.state === 'failed' && next.error) {
      setError(next.error)
      dispatch({ type: 'STEP_FAILED', step: 'trust', error: next.error })
    }
  }, [dispatch])

  const clearSession = useCallback(() => {
    setSession(null)
    dispatch({ type: 'SET_TRUST_SESSION', trustSession: null })
  }, [dispatch])

  useEffect(() => {
    if (!server || !session?.session_id || session.completed) return
    const timer = setInterval(() => {
      void refreshStatus()
    }, 1500)
    return () => clearInterval(timer)
  }, [server, session?.completed, session?.session_id])

  const handleStart = useCallback(async () => {
    if (!server || loading) return
    setLoading(true)
    setError(null)
    try {
      const next = await postStartCopilotTrust(server.ip, server.port)
      syncSession(next)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start Copilot trust setup.'
      setError(message)
      dispatch({ type: 'STEP_FAILED', step: 'trust', error: message })
    } finally {
      setLoading(false)
    }
  }, [dispatch, loading, server, syncSession])

  const refreshStatus = useCallback(async () => {
    if (!server || !session?.session_id) return
    try {
      const next = await fetchCopilotTrustStatus(server.ip, server.port, session.session_id)
      syncSession(next)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh trust status.'
      if (/not found/i.test(message)) {
        clearSession()
        setError('The previous Copilot trust session expired. Starting a new one...')
        return
      }
      setError(message)
    }
  }, [clearSession, server, session?.session_id, syncSession])

  useEffect(() => {
    if (!server || session?.session_id || loading) return
    void handleStart()
  }, [handleStart, loading, server, session?.session_id])

  useEffect(() => {
    if (!server || session?.session_id || loading === true || error !== 'The previous Copilot trust session expired. Starting a new one...') return
    void handleStart()
  }, [error, handleStart, loading, server, session?.session_id])

  const trusted = session?.trusted === true
  const waiting = !!session && !session.completed && !trusted

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        {loading || waiting ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : trusted ? (
          <View style={[styles.resultIcon, { backgroundColor: '#22c55e20' }]}>
            <CheckCircle color="#22c55e" size={40} strokeWidth={1.5} />
          </View>
        ) : (
          <View style={[styles.resultIcon, { backgroundColor: colors.primary + '20' }]}>
            <ShieldCheck color={colors.primary} size={40} strokeWidth={1.5} />
          </View>
        )}

        <Text style={[styles.title, { color: colors.text }]}>
          {trusted ? 'Trust configured' : waiting ? 'Waiting for trust approval...' : 'Trust this workspace'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {trusted
            ? 'GitHub Copilot can now run against this workspace path.'
            : 'Copilot needs trusted access to the current workspace before PocketDev can launch it.'}
        </Text>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Trust target</Text>
          <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
            {session?.trust_target ?? 'The current workspace path will be trusted during setup.'}
          </Text>
          {session?.prompt ? (
            <Text style={[styles.prompt, { color: colors.textTertiary }]}>{session.prompt}</Text>
          ) : null}
          {error ? (
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          ) : null}
        </View>
      </View>

      {!trusted ? (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            if (session?.session_id) {
              void refreshStatus()
              return
            }
            void handleStart()
          }}
          activeOpacity={0.7}
          disabled={loading}
        >
          <RefreshCw color={colors.primaryText} size={16} strokeWidth={2.25} />
          <Text style={[styles.buttonText, { color: colors.primaryText }]}>
            {session?.session_id ? 'Check trust status' : 'Start trust setup'}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing[4],
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
  },
  resultIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
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
  card: {
    width: '100%',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[2],
  },
  cardTitle: {
    ...typographyScale.base,
    fontWeight: '700',
  },
  cardBody: {
    ...typographyScale.sm,
  },
  prompt: {
    ...typographyScale.xs,
    fontFamily: 'monospace',
  },
  errorText: {
    ...typographyScale.sm,
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
