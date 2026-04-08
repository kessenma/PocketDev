import React, { useState } from 'react'
import { View, Text, Image, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useConnectionStore } from '../../../stores/connection'
import { postVerifyRust } from '../../../services/api'
import { Assets } from '../../../../assets'
import { Check, RefreshCw, CheckCircle, XCircle } from 'lucide-react-native'

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
  const [path, setPath] = useState<string | null>(null)
  const [cargoVersion, setCargoVersion] = useState<string | null>(null)
  const [rustupInstalled, setRustupInstalled] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleVerify() {
    if (!server) return
    setState('loading')
    setError(null)

    try {
      const result = await postVerifyRust(server.ip, server.port)
      setVersion(result.version)
      setPath(result.path)
      setCargoVersion(result.cargo_version)
      setRustupInstalled(result.rustup_installed)

      if (result.installed && result.cargo_installed) {
        setState('success')
        setTimeout(() => {
          dispatch({ type: 'STEP_COMPLETE', step: 'verify' })
        }, 800)
      } else {
        setState('failed')
        const missing: string[] = []
        if (!result.installed) missing.push('rustc')
        if (!result.cargo_installed) missing.push('cargo')
        setError(`Not detected: ${missing.join(', ')}. Try going back and re-running the install step.`)
      }
    } catch (err) {
      setState('failed')
      setError(err instanceof Error ? err.message : 'Verification failed')
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        {state === 'idle' && (
          <Image
            source={isDark ? Assets.rustWhite : Assets.rustBlack}
            style={styles.logo}
            resizeMode="contain"
          />
        )}
        {state === 'loading' && (
          <ActivityIndicator size="large" color={colors.primary} />
        )}
        {state === 'success' && (
          <View style={[styles.resultIcon, { backgroundColor: '#22c55e20' }]}>
            <CheckCircle color="#22c55e" size={40} strokeWidth={1.5} />
          </View>
        )}
        {state === 'failed' && (
          <View style={[styles.resultIcon, { backgroundColor: colors.error + '20' }]}>
            <XCircle color={colors.error} size={40} strokeWidth={1.5} />
          </View>
        )}

        <Text style={[styles.title, { color: colors.text }]}>
          {state === 'success' ? 'Rust is ready!' :
            state === 'loading' ? 'Verifying...' :
            state === 'failed' ? 'Verification Failed' :
            'Verify Installation'}
        </Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {state === 'success' ? 'Rust toolchain is installed and working.' :
            state === 'loading' ? 'Checking rustc and cargo...' :
            state === 'failed' ? 'Some components could not be verified.' :
            'Confirm that rustc and cargo are properly installed.'}
        </Text>

        {state === 'success' && (
          <View style={[styles.detailsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <DetailRow label="rustc" value={version ? `v${version}` : 'installed'} ok colors={colors} />
            <DetailRow label="Path" value={path ?? 'unknown'} ok colors={colors} />
            <DetailRow label="cargo" value={cargoVersion ? `v${cargoVersion}` : 'installed'} ok colors={colors} />
            <DetailRow label="rustup" value={rustupInstalled ? 'installed' : 'not found'} ok={rustupInstalled} colors={colors} />
          </View>
        )}

        {state === 'failed' && error && (
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        )}
      </View>

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

function DetailRow({ label, value, ok, colors }: {
  label: string; value: string; ok: boolean;
  colors: ReturnType<typeof useTheme>['colors']
}) {
  return (
    <View style={detailStyles.row}>
      <View style={detailStyles.labelRow}>
        {ok ? (
          <Check color="#22c55e" size={14} strokeWidth={2.5} />
        ) : (
          <XCircle color={colors.error} size={14} strokeWidth={2} />
        )}
        <Text style={[detailStyles.label, { color: colors.textSecondary }]}>{label}</Text>
      </View>
      <Text style={[detailStyles.value, { color: colors.textTertiary }]}>{value}</Text>
    </View>
  )
}

const detailStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[1],
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  label: {
    ...typographyScale.sm,
    fontWeight: '500',
  },
  value: {
    ...typographyScale.xs,
    fontFamily: 'monospace',
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
  logo: {
    width: 48,
    height: 48,
    marginBottom: spacing[2],
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
  },
  subtitle: {
    ...typographyScale.sm,
    textAlign: 'center',
  },
  detailsCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[1],
    marginTop: spacing[2],
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
