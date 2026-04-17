import React, { useRef, useState } from 'react'
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius } from '@pocketdev/shared/theme'
import { typeStyles } from '../../../theme/typography'
import { useConnectionStore } from '../../../stores/connection'
import { useTerminalCommand } from '../../../hooks/useTerminalCommand'
import { postVerifyGo } from '../../../services/api'
import { Assets } from '../../../../assets'
import { ArrowRight, Check, RefreshCw, XCircle } from 'lucide-react-native'
import CopyButton from '../../shared/CopyButton'
import SetupProgressCard from '../shared/SetupProgressCard'
import SetupTerminalPanel from '../shared/SetupTerminalPanel'

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'verify' }
  | { type: 'STEP_FAILED'; step: 'verify'; error: string }

interface Props {
  dispatch: (action: WizardAction) => void
}

type VerifyState = 'idle' | 'loading' | 'success' | 'failed'

const DIAG_CMD = 'echo "--- go version ---" && go version 2>&1; echo "--- go env GOPATH GOROOT ---" && go env GOPATH GOROOT 2>&1; echo "--- which go ---" && which go 2>&1; echo "--- echo $PATH ---" && echo $PATH'

export default function VerifyStep({ dispatch }: Props) {
  const { colors, isDark } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const [state, setState] = useState<VerifyState>('idle')
  const [version, setVersion] = useState<string | null>(null)
  const [path, setPath] = useState<string | null>(null)
  const [gopath, setGopath] = useState<string | null>(null)
  const [goroot, setGoroot] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rawResponse, setRawResponse] = useState<string | null>(null)
  const [showOutput, setShowOutput] = useState(false)
  const [diagRan, setDiagRan] = useState(false)
  const scrollRef = useRef<ScrollView>(null)

  const { output: diagOutput, sendCommand } = useTerminalCommand({
    persistent: true,
    errorPatterns: [],
    onOutput: () => {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50)
    },
  })

  async function handleVerify() {
    if (!server) return
    setState('loading')
    setError(null)
    setRawResponse(null)

    if (!diagRan) {
      sendCommand(DIAG_CMD)
      setDiagRan(true)
    }

    try {
      const result = await postVerifyGo(server.ip, server.port)
      setRawResponse(JSON.stringify(result, null, 2))
      setVersion(result.version)
      setPath(result.path)
      setGopath(result.gopath)
      setGoroot(result.goroot)

      if (result.installed) {
        setState('success')
      } else {
        setState('failed')
        setShowOutput(true)
        setError('Go binary not detected. Try going back and re-running the install step.')
      }
    } catch (err) {
      setState('failed')
      setShowOutput(true)
      setError(err instanceof Error ? err.message : 'Verification failed')
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        {state === 'idle' && (
          <Image
            source={isDark ? Assets.goWhite : Assets.goBlack}
            style={styles.logo}
            resizeMode="contain"
          />
        )}

        <Text style={[styles.title, { color: colors.text }]}>
          {state === 'success' ? 'Go is ready!' :
            state === 'loading' ? 'Verifying...' :
            state === 'failed' ? 'Verification Failed' :
            'Verify Installation'}
        </Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {state === 'success' ? 'Go toolchain is installed and working.' :
            state === 'loading' ? 'Checking go binary...' :
            state === 'failed' ? 'Go could not be verified.' :
            'Confirm that the Go toolchain is properly installed.'}
        </Text>

        {state === 'loading' && (
          <SetupProgressCard tone="running" message="Checking go binary..." />
        )}
        {state === 'success' && (
          <SetupProgressCard tone="success" message="Go toolchain is installed and working." />
        )}
        {state === 'failed' && (
          <SetupProgressCard tone="error" message="Go could not be verified." />
        )}

        {state === 'success' && (
          <View style={[styles.detailsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <DetailRow label="go" value={version ? `v${version}` : 'installed'} ok colors={colors} />
            <DetailRow label="Path" value={path ?? 'unknown'} ok colors={colors} />
            <DetailRow label="GOPATH" value={gopath ?? '~/go (default)'} ok colors={colors} />
            <DetailRow label="GOROOT" value={goroot ?? 'unknown'} ok={!!goroot} colors={colors} />
          </View>
        )}

        {state === 'failed' && error && (
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        )}

        {state === 'failed' && rawResponse && (
          <View style={[styles.rawCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.rawLabel, { color: colors.textTertiary }]}>API Response</Text>
            <Text style={[styles.rawText, { color: colors.textSecondary }]} selectable>{rawResponse}</Text>
            <CopyButton value={rawResponse} label="Copy response" />
          </View>
        )}
      </View>

      {diagRan && (
        <SetupTerminalPanel
          visible={showOutput}
          onToggle={() => setShowOutput(!showOutput)}
          output={diagOutput}
          scrollRef={scrollRef}
          label="Terminal diagnostics"
        />
      )}

      {state === 'idle' && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={handleVerify}
          activeOpacity={0.7}
        >
          <Text style={[styles.buttonText, { color: colors.primaryText }]}>Verify</Text>
        </TouchableOpacity>
      )}

      {state === 'success' && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => dispatch({ type: 'STEP_COMPLETE', step: 'verify' })}
          activeOpacity={0.7}
        >
          <Text style={[styles.buttonText, { color: colors.primaryText }]}>Continue</Text>
          <ArrowRight color={colors.primaryText} size={16} strokeWidth={2.25} />
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
    ...typeStyles.bodySmall,
  },
  value: {
    ...typeStyles.mono,
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
  title: {
    ...typeStyles.screenTitle,
  },
  subtitle: {
    ...typeStyles.bodySmall,
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
    ...typeStyles.bodySmall,
    textAlign: 'center',
  },
  rawCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[2],
  },
  rawLabel: {
    ...typeStyles.sectionTitle,
    letterSpacing: 0.6,
  },
  rawText: {
    ...typeStyles.mono,
  },
  actionButton: {
    width: '100%',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing[2],
  },
  buttonText: {
    ...typeStyles.button,
  },
})
