import React, { useState, useRef } from 'react'
import { View, Text, Image, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius } from '@pocketdev/shared/theme'
import { typeStyles } from '../../../theme/typography'
import { useConnectionStore } from '../../../stores/connection'
import { useTerminalCommand } from '../../../hooks/useTerminalCommand'
import { postVerifyTypeScript } from '../../../services/api'
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

const DIAG_CMD = 'echo "--- which tsc ---" && which tsc 2>&1; echo "--- tsc --version ---" && tsc --version 2>&1; echo "--- npm list -g typescript ---" && npm list -g typescript 2>&1; echo "--- echo $PATH ---" && echo $PATH'

export default function VerifyStep({ dispatch }: Props) {
  const { colors, isDark } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const [state, setState] = useState<VerifyState>('idle')
  const [version, setVersion] = useState<string | null>(null)
  const [path, setPath] = useState<string | null>(null)
  const [tsNodeInstalled, setTsNodeInstalled] = useState(false)
  const [tsNodeVersion, setTsNodeVersion] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rawResponse, setRawResponse] = useState<string | null>(null)
  const [showOutput, setShowOutput] = useState(false)
  const [diagRan, setDiagRan] = useState(false)
  const scrollRef = useRef<ScrollView>(null)

  const {
    output: diagOutput,
    sendCommand,
  } = useTerminalCommand({
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

    // Run diagnostic terminal command alongside the API call for visibility
    if (!diagRan) {
      sendCommand(DIAG_CMD)
      setDiagRan(true)
    }

    try {
      const result = await postVerifyTypeScript(server.ip, server.port)
      setRawResponse(JSON.stringify(result, null, 2))
      setVersion(result.version)
      setPath(result.path)
      setTsNodeInstalled(result.ts_node_installed)
      setTsNodeVersion(result.ts_node_version)

      if (result.installed) {
        setState('success')
      } else {
        setState('failed')
        setShowOutput(true)
        setError('tsc binary not detected. Check the terminal output below for details.')
      }
    } catch (err) {
      setState('failed')
      setShowOutput(true)
      setError(err instanceof Error ? err.message : 'Verification failed')
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.center}>
        {state === 'idle' && (
          <Image
            source={isDark ? Assets.typescriptWhite : Assets.typescriptBlack}
            style={styles.logo}
            resizeMode="contain"
          />
        )}
        {state === 'loading' && (
          <ActivityIndicator size="large" color={colors.primary} />
        )}

        <Text style={[styles.title, { color: colors.text }]}>
          {state === 'success' ? 'TypeScript is ready!' :
            state === 'loading' ? 'Verifying...' :
            state === 'failed' ? 'Verification Failed' :
            'Verify Installation'}
        </Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {state === 'success' ? 'TypeScript compiler is installed and working.' :
            state === 'loading' ? 'Checking tsc binary...' :
            state === 'failed' ? 'TypeScript could not be verified.' :
            'Confirm that the TypeScript compiler is properly installed.'}
        </Text>

        {state === 'loading' && (
          <SetupProgressCard tone="running" message="Checking tsc binary..." />
        )}
        {state === 'success' && (
          <SetupProgressCard tone="success" message="TypeScript compiler is installed and working." />
        )}
        {state === 'failed' && (
          <SetupProgressCard tone="error" message="TypeScript could not be verified." />
        )}

        {state === 'success' && (
          <View style={[styles.detailsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <DetailRow label="tsc" value={version ? `v${version}` : 'installed'} ok colors={colors} />
            <DetailRow label="Path" value={path ?? 'unknown'} ok colors={colors} />
            <DetailRow
              label="ts-node"
              value={tsNodeInstalled ? (tsNodeVersion ? `v${tsNodeVersion}` : 'installed') : 'not installed'}
              ok={tsNodeInstalled}
              colors={colors}
            />
          </View>
        )}

        {state === 'failed' && error && (
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        )}

        {/* Raw API response on failure */}
        {state === 'failed' && rawResponse && (
          <View style={[styles.rawCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.rawLabel, { color: colors.textTertiary }]}>API Response</Text>
            <Text style={[styles.rawText, { color: colors.textSecondary }]} selectable>{rawResponse}</Text>
            <CopyButton value={rawResponse} label="Copy response" />
          </View>
        )}
      </View>

      {/* Terminal diagnostic output */}
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
    </ScrollView>
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
    ...typeStyles.bodyStrong,
  },
  value: {
    ...typeStyles.mono,
  },
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    gap: spacing[3],
    paddingBottom: spacing[6],
  },
  center: {
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[6],
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
    marginTop: spacing[1],
  },
  rawCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[2],
    marginTop: spacing[2],
  },
  rawLabel: {
    ...typeStyles.sectionTitle,
  },
  rawText: {
    ...typeStyles.mono,
  },
  outputToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderWidth: 1,
    borderRadius: borderRadius.md,
  },
  outputToggleText: {
    ...typeStyles.bodyStrong,
  },
  outputBox: {
    maxHeight: 200,
    borderRadius: borderRadius.md,
    padding: spacing[3],
  },
  outputText: {
    ...typeStyles.mono,
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
})
