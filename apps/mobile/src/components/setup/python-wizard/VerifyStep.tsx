import React, { useState } from 'react'
import { View, Text, Image, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useConnectionStore } from '../../../stores/connection'
import { postVerifyPython } from '../../../services/api'
import { Assets } from '../../../../assets'
import { Check, RefreshCw } from 'lucide-react-native'

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'verify' }
  | { type: 'STEP_FAILED'; step: 'verify'; error: string }

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
      const result = await postVerifyPython(server.ip, server.port)
      if (result.installed && result.pip_installed) {
        setVersion(result.version)
        setState('success')
        setTimeout(() => {
          dispatch({ type: 'STEP_COMPLETE', step: 'verify' })
        }, 800)
      } else {
        setState('failed')
        setError('Python or pip installation could not be verified. Please try installing again.')
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
              source={isDark ? Assets.pythonWhite : Assets.pythonBlack}
              style={styles.logo}
              resizeMode="contain"
            />
          )}
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]}>
          {state === 'success' ? 'Python is ready!' :
            state === 'loading' ? 'Verifying...' :
            'Verify Installation'}
        </Text>

        {/* Subtitle */}
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {state === 'success' ? `Python ${version ?? 'unknown'} with pip` :
            state === 'loading' ? 'Checking your Python installation...' :
            state === 'failed' ? 'Installation could not be verified' :
            'Confirm that Python 3 and pip are installed'}
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
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={handleVerify}
          activeOpacity={0.7}
        >
          <RefreshCw color={colors.primaryText} size={16} strokeWidth={2.25} />
          <Text style={[styles.buttonText, { color: colors.primaryText }]}>Retry</Text>
        </TouchableOpacity>
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
    ...typographyScale['2xl'],
    fontWeight: '700',
  },
  subtitle: {
    ...typographyScale.base,
    textAlign: 'center',
  },
  errorText: {
    ...typographyScale.sm,
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
    ...typographyScale.base,
    fontWeight: '600',
  },
})
