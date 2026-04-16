import React, { useEffect, useState } from 'react'
import { View, Text, Image, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { Check, RefreshCw, ChevronLeft } from 'lucide-react-native'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../../contexts/ThemeContext'
import { useConnectionStore } from '../../../stores/connection'
import { postVerifyMinimax } from '../../../services/api'
import { Assets } from '../../../../assets'
import type { MinimaxSetupStatus } from '@pocketdev/shared/types'

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'verify'; minimaxStatus?: MinimaxSetupStatus | null }
  | { type: 'STEP_FAILED'; step: 'verify'; error: string }
  | { type: 'GO_BACK' }

interface Props {
  dispatch: (action: WizardAction) => void
}

type VerifyState = 'loading' | 'success' | 'failed'

export default function VerifyStep({ dispatch }: Props) {
  const { colors, isDark } = useTheme()
  const server = useConnectionStore((state) => state.server)
  const [state, setState] = useState<VerifyState>('loading')
  const [maskedKey, setMaskedKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void handleVerify()
  }, [])

  async function handleVerify() {
    if (!server) return
    setState('loading')
    setError(null)

    try {
      const result = await postVerifyMinimax(server.ip, server.port)
      if (result.verified && result.api_key_configured) {
        setMaskedKey(result.api_key_masked)
        setState('success')
        setTimeout(() => {
          dispatch({ type: 'STEP_COMPLETE', step: 'verify', minimaxStatus: result })
        }, 800)
      } else {
        setState('failed')
        setError(result.verify_output || 'Minimax API key could not be verified. Please try again.')
      }
    } catch (err) {
      setState('failed')
      setError(err instanceof Error ? err.message : 'Verification failed')
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: state === 'success' ? colors.primary : state === 'failed' ? colors.error : colors.surface,
              borderColor: state === 'loading' ? colors.border : 'transparent',
              borderWidth: state === 'loading' ? 1 : 0,
            },
          ]}
        >
          {state === 'success' ? (
            <Check color={colors.primaryText} size={32} strokeWidth={2.5} />
          ) : state === 'loading' ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Image source={isDark ? Assets.minimaxWhite : Assets.minimaxBlack} style={styles.logo} resizeMode="contain" />
          )}
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          {state === 'success' ? 'Verified!' : state === 'loading' ? 'Verifying…' : 'Verification failed'}
        </Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {state === 'success'
            ? 'Minimax API key is present in the OpenCode config'
            : state === 'loading'
              ? 'Confirming the Minimax API key is written to the workspace config…'
              : 'Could not confirm the API key is present. Please go back and try again.'}
        </Text>

        {maskedKey && state === 'success' ? (
          <Text style={[styles.maskedKey, { color: colors.textTertiary }]}>{maskedKey}</Text>
        ) : null}

        {state === 'failed' && error ? (
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        ) : null}
      </View>

      {state === 'failed' ? (
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
            onPress={() => void handleVerify()}
            activeOpacity={0.7}
          >
            <RefreshCw color={colors.primaryText} size={16} strokeWidth={2.25} />
            <Text style={[styles.buttonText, { color: colors.primaryText }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing[4] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[6] },
  iconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: spacing[2] },
  logo: { width: 36, height: 36 },
  title: { ...typographyScale['2xl'], fontWeight: '700' },
  subtitle: { ...typographyScale.base, textAlign: 'center' },
  maskedKey: { ...typographyScale.sm, fontFamily: 'monospace', textAlign: 'center' },
  errorText: { ...typographyScale.sm, textAlign: 'center', marginTop: spacing[1] },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[4], borderRadius: borderRadius.lg },
  buttonText: { ...typographyScale.base, fontWeight: '600' },
  failedActions: { flexDirection: 'row', gap: spacing[3] },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[4], paddingHorizontal: spacing[5], borderRadius: borderRadius.lg, borderWidth: 1 },
  secondaryText: { ...typographyScale.base, fontWeight: '600' },
})
