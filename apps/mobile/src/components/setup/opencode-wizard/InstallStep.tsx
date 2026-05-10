import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { ArrowRight, CheckCircle, RefreshCw, TerminalSquare } from 'lucide-react-native'
import { spacing, borderRadius } from '@pocketdev/shared/theme'
import { typeStyles } from '../../../theme/typography'
import { useTheme } from '../../../contexts/ThemeContext'
import { useConnectionStore } from '../../../stores/connection'
import { fetchOpenCodeInstallCommand, fetchOpenCodeSetupStatus, postInstallOpenCode } from '../../../services/api'
import { Assets } from '../../../../assets'
import type { OpenCodeSetupStatus } from '@pocketdev/shared/types'
import CopyButton from '../../ui/CopyButton'

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'install'; openCodeStatus?: OpenCodeSetupStatus | null }
  | { type: 'STEP_FAILED'; step: 'install'; error: string }

interface Props {
  dispatch: (action: WizardAction) => void
}

export default function InstallStep({ dispatch }: Props) {
  const { colors, isDark } = useTheme()
  const server = useConnectionStore((state) => state.server)
  const [status, setStatus] = useState<'idle' | 'installing' | 'success' | 'failed'>('idle')
  const [output, setOutput] = useState<string | null>(null)
  const [installPath, setInstallPath] = useState<string | null>(null)
  const [version, setVersion] = useState<string | null>(null)
  const [installCommand, setInstallCommand] = useState<string>('curl -fsSL https://opencode.ai/install | bash')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!server) return
    fetchOpenCodeInstallCommand(server.ip, server.port)
      .then(setInstallCommand)
      .catch(() => {})
  }, [server])

  const handleInstall = useCallback(async () => {
    if (!server) return
    setStatus('installing')
    setError(null)
    try {
      const result = await postInstallOpenCode(server.ip, server.port)
      setOutput(result.output)
      setInstallPath(result.path)
      setVersion(result.version)

      if (!result.success) {
        setStatus('failed')
        setError(result.error ?? 'OpenCode install failed.')
        dispatch({ type: 'STEP_FAILED', step: 'install', error: result.error ?? 'OpenCode install failed.' })
        return
      }

      const latestStatus = await fetchOpenCodeSetupStatus(server.ip, server.port)
      setStatus('success')
      dispatch({ type: 'STEP_COMPLETE', step: 'install', openCodeStatus: latestStatus })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'OpenCode install failed.'
      setStatus('failed')
      setError(message)
      dispatch({ type: 'STEP_FAILED', step: 'install', error: message })
    }
  }, [dispatch, server])

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image source={isDark ? Assets.opencodeWhite : Assets.opencodeBlack} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.title, { color: colors.text }]}>Enable OpenCode CLI</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            PocketDev will install OpenCode on the paired workspace and refresh the saved tool path.
          </Text>
        </View>

        <View style={[styles.planCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.commandHeader}>
            <TerminalSquare color={colors.primary} size={18} strokeWidth={2.25} />
            <Text style={[styles.commandLabel, { color: colors.text }]}>Install command</Text>
          </View>
          <View style={[styles.commandBlock, { backgroundColor: colors.background }]}>
            <Text style={[styles.commandText, { color: colors.text }]} selectable>
              $ {installCommand}
            </Text>
          </View>
          <Text style={[styles.commandHint, { color: colors.textTertiary }]}>
            The wizard uses OpenCode’s official install script, then re-detects the binary from the server.
          </Text>
        </View>

        <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: status === 'failed' ? colors.error : status === 'success' ? '#22c55e' : colors.border }]}>
          {status === 'installing' ? (
            <View style={styles.statusRow}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={[styles.statusTitle, { color: colors.text }]}>Installing OpenCode CLI...</Text>
            </View>
          ) : status === 'success' ? (
            <View style={styles.statusRow}>
              <CheckCircle color="#22c55e" size={18} strokeWidth={2.25} />
              <Text style={[styles.statusTitle, { color: colors.text }]}>OpenCode CLI ready</Text>
            </View>
          ) : status === 'failed' ? (
            <View style={styles.statusRow}>
              <RefreshCw color={colors.error} size={18} strokeWidth={2.25} />
              <Text style={[styles.statusTitle, { color: colors.text }]}>Install failed</Text>
            </View>
          ) : (
            <Text style={[styles.statusTitle, { color: colors.text }]}>Ready to enable</Text>
          )}

          {version ? <Text style={[styles.metaText, { color: colors.textSecondary }]}>Detected version: v{version}</Text> : null}
          {installPath ? <Text style={[styles.metaText, { color: colors.textSecondary }]}>Detected tool path: {installPath}</Text> : null}
          {error ? <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text> : null}
          {output ? (
            <View style={styles.outputSection}>
              <CopyButton value={output} label="Copy output" />
              <View style={[styles.outputBox, { backgroundColor: colors.background }]}>
                <Text style={[styles.outputText, { color: colors.textSecondary }]} selectable>
                  {output}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {(status === 'idle' || status === 'failed') ? (
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={handleInstall} activeOpacity={0.7}>
          {status === 'failed' ? (
            <>
              <RefreshCw color={colors.primaryText} size={18} strokeWidth={2.25} />
              <Text style={[styles.buttonText, { color: colors.primaryText }]}>Try install again</Text>
            </>
          ) : (
            <>
              <Text style={[styles.buttonText, { color: colors.primaryText }]}>Enable OpenCode</Text>
              <ArrowRight color={colors.primaryText} size={18} strokeWidth={2.25} />
            </>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing[3] },
  scroll: { flex: 1 },
  scrollContent: { gap: spacing[3], paddingBottom: spacing[4] },
  hero: { alignItems: 'center', gap: spacing[2], paddingTop: spacing[4] },
  logo: { width: 42, height: 42 },
  title: { ...typeStyles.screenTitle, textAlign: 'center' },
  subtitle: { ...typeStyles.bodySmall, textAlign: 'center' },
  planCard: { borderWidth: 1, borderRadius: borderRadius.lg, padding: spacing[4], gap: spacing[3] },
  commandHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  commandLabel: { ...typeStyles.bodyStrong },
  commandBlock: { borderRadius: borderRadius.md, padding: spacing[3] },
  commandText: { ...typeStyles.mono },
  commandHint: { ...typeStyles.meta },
  statusCard: { borderWidth: 1, borderRadius: borderRadius.lg, padding: spacing[4], gap: spacing[3] },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  statusTitle: { ...typeStyles.bodyStrong },
  metaText: { ...typeStyles.bodySmall },
  errorText: { ...typeStyles.bodySmall },
  outputSection: { gap: spacing[2] },
  outputBox: { borderRadius: borderRadius.md, padding: spacing[3] },
  outputText: { ...typeStyles.mono },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[4], borderRadius: borderRadius.lg },
  buttonText: { ...typeStyles.button },
})
