import React, { useEffect, useState } from 'react'
import { View, Text, Image, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { Check, RefreshCw, ChevronLeft } from 'lucide-react-native'
import { spacing, borderRadius } from '@pocketdev/shared/theme'
import { typeStyles } from '../../../theme/typography'
import { useTheme } from '../../../contexts/ThemeContext'
import { useConnectionStore } from '../../../stores/connection'
import { postVerifyMinimax } from '../../../services/api'
import { Assets } from '../../../../assets'
import type { MinimaxSetupStatus } from '@pocketdev/shared/types'
import TerminalView from '../../shared/TerminalView'

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
  const [terminalOutput, setTerminalOutput] = useState('→ Verifying Minimax API key…')

  useEffect(() => {
    void handleVerify()
  }, [])

  async function handleVerify() {
    if (!server) return
    setState('loading')
    setError(null)
    setTerminalOutput('→ Verifying Minimax API key…')

    try {
      const result = await postVerifyMinimax(server.ip, server.port)
      if (result.verified && result.api_key_configured) {
        setMaskedKey(result.api_key_masked)
        const output = result.verify_output ? result.verify_output : `✓ API key verified: ${result.api_key_masked ?? '(masked)'}`
        setTerminalOutput(output)
        setState('success')
        setTimeout(() => {
          dispatch({ type: 'STEP_COMPLETE', step: 'verify', minimaxStatus: result })
        }, 800)
      } else {
        const output = result.verify_output || 'Minimax API key could not be verified. Please try again.'
        setTerminalOutput(output)
        setState('failed')
        setError(output)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Verification failed'
      setTerminalOutput(`✗ ${msg}`)
      setState('failed')
      setError(msg)
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

      </View>

      <View style={styles.terminal}>
        <TerminalView output={terminalOutput} aiAssistAvailable={false} />
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
  center: { alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[6], paddingTop: spacing[4] },
  iconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: spacing[2] },
  logo: { width: 36, height: 36 },
  title: { ...typeStyles.screenTitle },
  subtitle: { ...typeStyles.body, textAlign: 'center' },
  maskedKey: { ...typeStyles.mono, textAlign: 'center' },
  terminal: { flex: 1, borderRadius: borderRadius.lg, overflow: 'hidden', minHeight: 140 },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[4], borderRadius: borderRadius.lg },
  buttonText: { ...typeStyles.button },
  failedActions: { flexDirection: 'row', gap: spacing[3] },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[4], paddingHorizontal: spacing[5], borderRadius: borderRadius.lg, borderWidth: 1 },
  secondaryText: { ...typeStyles.button },
})
