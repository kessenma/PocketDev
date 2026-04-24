import React, { useState } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius } from '@pocketdev/shared/theme'
import { typeStyles } from '../../../theme/typography'
import { useConnectionStore } from '../../../stores/connection'
import { postVerifyOpenCodeProvider } from '../../../services/api'
import { CheckCircle, RefreshCw, XCircle } from 'lucide-react-native'

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'verify' }
  | { type: 'STEP_FAILED'; step: 'verify'; error: string }

interface Props {
  dispatch: (action: WizardAction) => void
}

type VerifyState = 'idle' | 'loading' | 'success' | 'failed'

export default function VerifyStep({ dispatch }: Props) {
  const { colors } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const [state, setState] = useState<VerifyState>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleVerify() {
    if (!server) return
    setState('loading')
    setError(null)

    try {
      const result = await postVerifyOpenCodeProvider(server.ip, server.port, 'github-copilot')
      if (result.authenticated) {
        setState('success')
        setTimeout(() => {
          dispatch({ type: 'STEP_COMPLETE', step: 'verify' })
        }, 800)
      } else {
        setState('failed')
        setError('GitHub Copilot authentication not found in opencode. Please sign in again.')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed'
      setState('failed')
      setError(message)
      dispatch({ type: 'STEP_FAILED', step: 'verify', error: message })
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        {state === 'idle' ? null : state === 'loading' ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : state === 'success' ? (
          <View style={[styles.resultIcon, { backgroundColor: '#22c55e20' }]}>
            <CheckCircle color="#22c55e" size={40} strokeWidth={1.5} />
          </View>
        ) : (
          <View style={[styles.resultIcon, { backgroundColor: colors.error + '20' }]}>
            <XCircle color={colors.error} size={40} strokeWidth={1.5} />
          </View>
        )}

        <Text style={[styles.title, { color: colors.text }]}>
          {state === 'success' ? 'GitHub Copilot is ready!' :
            state === 'loading' ? 'Verifying…' :
            state === 'failed' ? 'Verification failed' :
            'Verify Copilot'}
        </Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {state === 'success'
            ? 'GitHub Copilot is authenticated in opencode and ready to use.'
            : 'Confirm that GitHub Copilot is authenticated in opencode.'}
        </Text>

        {error ? (
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        ) : null}
      </View>

      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: colors.primary }]}
        onPress={handleVerify}
        activeOpacity={0.7}
      >
        {state === 'failed' ? (
          <>
            <RefreshCw color={colors.primaryText} size={16} strokeWidth={2.25} />
            <Text style={[styles.buttonText, { color: colors.primaryText }]}>Retry</Text>
          </>
        ) : (
          <Text style={[styles.buttonText, { color: colors.primaryText }]}>Verify</Text>
        )}
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing[4] },
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
  title: { ...typeStyles.screenTitle, textAlign: 'center' },
  subtitle: { ...typeStyles.bodySmall, textAlign: 'center' },
  errorText: { ...typeStyles.bodySmall, textAlign: 'center' },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
  },
  buttonText: { ...typeStyles.button },
})
