import React, { useState } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useConnectionStore } from '../../../stores/connection'
import { postVerifyCopilotSetup } from '../../../services/api'
import { CheckCircle, RefreshCw, XCircle } from 'lucide-react-native'
import type { CopilotSetupStatus } from '@pocketdev/shared/types'

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'verify'; copilotStatus?: CopilotSetupStatus | null }
  | { type: 'STEP_FAILED'; step: 'verify'; error: string }

interface Props {
  dispatch: (action: WizardAction) => void
}

type VerifyState = 'idle' | 'loading' | 'success' | 'failed'

export default function VerifyStep({ dispatch }: Props) {
  const { colors } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const [state, setState] = useState<VerifyState>('idle')
  const [status, setStatus] = useState<CopilotSetupStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleVerify() {
    if (!server) return
    setState('loading')
    setError(null)

    try {
      const result = await postVerifyCopilotSetup(server.ip, server.port)
      setStatus(result)

      if (result.installed && result.tmux_installed && result.authenticated && result.trust_configured) {
        setState('success')
        setTimeout(() => {
          dispatch({ type: 'STEP_COMPLETE', step: 'verify', copilotStatus: result })
        }, 800)
        return
      }

      setState('failed')
      setError('Copilot is still missing tmux, install, GitHub authentication, or workspace trust.')
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
          {state === 'success' ? 'Copilot is ready!' :
            state === 'loading' ? 'Verifying...' :
            state === 'failed' ? 'Verification failed' :
            'Verify Copilot'}
        </Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {state === 'success'
            ? 'tmux, Copilot install, GitHub authentication, and workspace trust all passed.'
            : 'Confirm that tmux and GitHub Copilot CLI are installed, authenticated, and trusted for this workspace.'}
        </Text>

        {status ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <DetailRow label="tmux" ok={status.tmux_installed} value={status.tmux_path ?? 'Missing'} colors={colors} />
            <DetailRow label="Install" ok={status.installed} value={status.version ? `v${status.version}` : 'Missing'} colors={colors} />
            <DetailRow label="GitHub" ok={status.authenticated} value={status.github_username ? `@${status.github_username}` : 'Not connected'} colors={colors} />
            <DetailRow label="Trust" ok={status.trust_configured} value={status.trust_target ?? 'Not trusted'} colors={colors} />
          </View>
        ) : null}

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

function DetailRow({
  label,
  ok,
  value,
  colors,
}: {
  label: string
  ok: boolean
  value: string
  colors: ReturnType<typeof useTheme>['colors']
}) {
  return (
    <View style={detailStyles.row}>
      <Text style={[detailStyles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[detailStyles.value, { color: ok ? '#22c55e' : colors.error }]}>{value}</Text>
    </View>
  )
}

const detailStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[3],
  },
  label: {
    ...typographyScale.sm,
    fontWeight: '500',
  },
  value: {
    ...typographyScale.xs,
    fontFamily: 'monospace',
    flex: 1,
    textAlign: 'right',
  },
})

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
  errorText: {
    ...typographyScale.sm,
    textAlign: 'center',
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
