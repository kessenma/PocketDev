import React, { useState, useCallback } from 'react'
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius } from '@pocketdev/shared/theme'
import { typeStyles } from '../../../theme/typography'
import { useConnectionStore } from '../../../stores/connection'
import { postInstallCopilot, fetchCopilotSetupStatus } from '../../../services/api'
import { Assets } from '../../../../assets'
import { ArrowRight, CheckCircle, RefreshCw, TerminalSquare } from 'lucide-react-native'
import type { CopilotSetupStatus } from '@pocketdev/shared/types'

const INSTALL_COMMAND = 'curl -fsSL https://gh.io/copilot-install | bash'

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'install'; copilotStatus?: CopilotSetupStatus | null }
  | { type: 'STEP_FAILED'; step: 'install'; error: string }

interface Props {
  dispatch: (action: WizardAction) => void
}

export default function InstallStep({ dispatch }: Props) {
  const { colors, isDark } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const [status, setStatus] = useState<'idle' | 'installing' | 'success' | 'failed'>('idle')
  const [output, setOutput] = useState<string | null>(null)
  const [installPath, setInstallPath] = useState<string | null>(null)
  const [tmuxPath, setTmuxPath] = useState<string | null>(null)
  const [version, setVersion] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleInstall = useCallback(async () => {
    if (!server) return
    setStatus('installing')
    setError(null)

    try {
      const result = await postInstallCopilot(server.ip, server.port)
      setOutput(result.output)
      setInstallPath(result.path)
      setTmuxPath(result.tmux_path)
      setVersion(result.version)

      if (!result.success) {
        const message = result.error ?? 'GitHub Copilot install failed.'
        setStatus('failed')
        setError(message)
        dispatch({ type: 'STEP_FAILED', step: 'install', error: message })
        return
      }

      const latestStatus = await fetchCopilotSetupStatus(server.ip, server.port)
      setStatus('success')
      dispatch({ type: 'STEP_COMPLETE', step: 'install', copilotStatus: latestStatus })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'GitHub Copilot install failed.'
      setStatus('failed')
      setError(message)
      dispatch({ type: 'STEP_FAILED', step: 'install', error: message })
    }
  }, [dispatch, server])

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image
            source={isDark ? Assets.githubWhite : Assets.githubBlack}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: colors.text }]}>Enable GitHub Copilot CLI</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            PocketDev will install `tmux` if needed, run the official Copilot installer, then refresh this workspace.
          </Text>
        </View>

        <View style={[styles.planCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.commandHeader}>
            <TerminalSquare color={colors.primary} size={18} strokeWidth={2.25} />
            <Text style={[styles.commandLabel, { color: colors.text }]}>Setup command</Text>
          </View>
          <View style={[styles.commandBlock, { backgroundColor: colors.background }]}>
            <Text style={[styles.commandText, { color: colors.text }]} selectable>
              $ {INSTALL_COMMAND}
            </Text>
          </View>
          <Text style={[styles.commandHint, { color: colors.textTertiary }]}>
            This step makes sure `tmux` is available first, then runs the official GitHub Copilot CLI installer.
          </Text>
        </View>

        <View style={[
          styles.statusCard,
          {
            backgroundColor: colors.surface,
            borderColor: status === 'failed' ? colors.error : status === 'success' ? '#22c55e' : colors.border,
          },
        ]}>
          {status === 'installing' ? (
            <View style={styles.statusRow}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={[styles.statusTitle, { color: colors.text }]}>Installing GitHub Copilot...</Text>
            </View>
          ) : status === 'success' ? (
            <View style={styles.statusRow}>
              <CheckCircle color="#22c55e" size={18} strokeWidth={2.25} />
              <Text style={[styles.statusTitle, { color: colors.text }]}>GitHub Copilot ready</Text>
            </View>
          ) : status === 'failed' ? (
            <View style={styles.statusRow}>
              <RefreshCw color={colors.error} size={18} strokeWidth={2.25} />
              <Text style={[styles.statusTitle, { color: colors.text }]}>Install failed</Text>
            </View>
          ) : (
            <Text style={[styles.statusTitle, { color: colors.text }]}>Ready to enable</Text>
          )}

          {version ? (
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>Detected version: v{version}</Text>
          ) : null}
          {tmuxPath ? (
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>Detected tmux path: {tmuxPath}</Text>
          ) : null}
          {installPath ? (
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>Detected tool path: {installPath}</Text>
          ) : null}
          {error ? (
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          ) : null}
          {output ? (
            <View style={[styles.outputBox, { backgroundColor: colors.background }]}>
              <Text style={[styles.outputText, { color: colors.textSecondary }]} selectable>
                {output}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {(status === 'idle' || status === 'failed') ? (
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          onPress={handleInstall}
          activeOpacity={0.7}
        >
          {status === 'failed' ? (
            <>
              <RefreshCw color={colors.primaryText} size={18} strokeWidth={2.25} />
              <Text style={[styles.buttonText, { color: colors.primaryText }]}>Try enable again</Text>
            </>
          ) : (
            <>
              <Text style={[styles.buttonText, { color: colors.primaryText }]}>Enable Copilot</Text>
              <ArrowRight color={colors.primaryText} size={18} strokeWidth={2.25} />
            </>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing[3],
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing[3],
    paddingBottom: spacing[4],
  },
  hero: {
    alignItems: 'center',
    gap: spacing[2],
    paddingTop: spacing[4],
  },
  logo: {
    width: 42,
    height: 42,
  },
  title: {
    ...typeStyles.heading,
    textAlign: 'center',
  },
  subtitle: {
    ...typeStyles.bodySmall,
    textAlign: 'center',
  },
  planCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[3],
  },
  commandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  commandLabel: {
    ...typeStyles.bodyBold,
  },
  commandBlock: {
    borderRadius: borderRadius.md,
    padding: spacing[3],
  },
  commandText: {
    ...typeStyles.mono,
  },
  commandHint: {
    ...typeStyles.meta,
  },
  statusCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[3],
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  statusTitle: {
    ...typeStyles.bodyBold,
  },
  metaText: {
    ...typeStyles.bodySmall,
  },
  errorText: {
    ...typeStyles.bodySmall,
  },
  outputBox: {
    borderRadius: borderRadius.md,
    padding: spacing[3],
  },
  outputText: {
    ...typeStyles.mono,
  },
  primaryButton: {
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
