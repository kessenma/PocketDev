import React, { useState } from 'react'
import { View, Text, Image, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius } from '@pocketdev/shared/theme'
import { typeStyles } from '../../../theme/typography'
import { useConnectionStore } from '../../../stores/connection'
import { postVerifyCodexAuth } from '../../../services/api'
import { Assets } from '../../../../assets'
import { Check, RefreshCw, ChevronLeft } from 'lucide-react-native'
import type { CodexSetupStatus } from '@pocketdev/shared/types'

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'verify'; codexStatus?: CodexSetupStatus | null }
  | { type: 'STEP_FAILED'; step: 'verify'; error: string }
  | { type: 'GO_BACK' }

interface Props {
  dispatch: (action: WizardAction) => void
}

type VerifyState = 'idle' | 'loading' | 'success' | 'failed'

export default function VerifyStep({ dispatch }: Props) {
  const { colors, isDark } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const [state, setState] = useState<VerifyState>('idle')
  const [version, setVersion] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleVerify() {
    if (!server) return
    setState('loading')
    setError(null)

    try {
      const result = await postVerifyCodexAuth(server.ip, server.port)
      if (result.authenticated) {
        setVersion(result.version)
        setState('success')
        // Short delay so user sees the success state
        setTimeout(() => {
          dispatch({ type: 'STEP_COMPLETE', step: 'verify', codexStatus: result })
        }, 800)
      } else {
        setState('failed')
        setError(result.auth_output || 'Authentication not detected. Please try signing in again.')
      }
    } catch (err) {
      setState('failed')
      setError(err instanceof Error ? err.message : 'Verification failed')
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        {/* Icon */}
        <View style={[
          styles.iconCircle,
          {
            backgroundColor: state === 'success' ? colors.primary
              : state === 'failed' ? colors.error
              : colors.surface,
            borderColor: state === 'idle' ? colors.border : 'transparent',
            borderWidth: state === 'idle' ? 1 : 0,
          },
        ]}>
          {state === 'success' ? (
            <Check color={colors.primaryText} size={32} strokeWidth={2.5} />
          ) : state === 'loading' ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Image
              source={isDark ? Assets.codexWhite : Assets.codexBlack}
              style={styles.logo}
              resizeMode="contain"
            />
          )}
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]}>
          {state === 'success' ? 'Authenticated!' :
            state === 'loading' ? 'Verifying...' :
            'Verify Authentication'}
        </Text>

        {/* Subtitle */}
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {state === 'success' ? `Codex CLI v${version ?? 'unknown'} is ready` :
            state === 'loading' ? 'Checking your authentication status...' :
            state === 'failed' ? 'Authentication could not be verified' :
            'Confirm that Codex CLI is signed in to your account'}
        </Text>

        {/* Error message */}
        {state === 'failed' && error && (
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        )}
      </View>

      {/* Actions */}
      {state === 'idle' && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={handleVerify}
          activeOpacity={0.7}
        >
          <Text style={[styles.buttonText, { color: colors.primaryText }]}>Verify</Text>
        </TouchableOpacity>
      )}

      {state === 'failed' && (
        <View style={styles.failedActions}>
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.border }]}
            onPress={() => dispatch({ type: 'GO_BACK' })}
            activeOpacity={0.7}
          >
            <ChevronLeft color={colors.text} size={16} strokeWidth={2.25} />
            <Text style={[styles.secondaryText, { color: colors.text }]}>Go Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary, flex: 1 }]}
            onPress={handleVerify}
            activeOpacity={0.7}
          >
            <RefreshCw color={colors.primaryText} size={16} strokeWidth={2.25} />
            <Text style={[styles.buttonText, { color: colors.primaryText }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
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
    paddingHorizontal: spacing[6],
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  logo: {
    width: 36,
    height: 36,
  },
  title: {
    ...typeStyles.heading,
  },
  subtitle: {
    ...typeStyles.body,
    textAlign: 'center',
  },
  errorText: {
    ...typeStyles.bodySmall,
    textAlign: 'center',
    marginTop: spacing[1],
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
    ...typeStyles.button,
  },
  failedActions: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[5],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  secondaryText: {
    ...typeStyles.button,
  },
})
