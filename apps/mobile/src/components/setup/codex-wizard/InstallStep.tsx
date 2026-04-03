import React, { useState, useCallback } from 'react'
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useConnectionStore } from '../../../stores/connection'
import { postInstallCodex, fetchCodexSetupStatus } from '../../../services/api'
import { Assets } from '../../../../assets'
import { ArrowRight, CheckCircle, RefreshCw, TerminalSquare } from 'lucide-react-native'
import type { CodexSetupStatus } from '@pocketdev/shared/types'

const INSTALL_COMMAND = 'sudo npm i -g @openai/codex'

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'install'; codexStatus?: CodexSetupStatus | null }
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
  const [version, setVersion] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleInstall = useCallback(async () => {
    if (!server) return
    setStatus('installing')
    setError(null)

    try {
      const result = await postInstallCodex(server.ip, server.port)
      setOutput(result.output)
      setInstallPath(result.path)
      setVersion(result.version)

      if (!result.success) {
        setStatus('failed')
        setError(result.error ?? 'Codex CLI install failed.')
        dispatch({ type: 'STEP_FAILED', step: 'install', error: result.error ?? 'Codex CLI install failed.' })
        return
      }

      const latestStatus = await fetchCodexSetupStatus(server.ip, server.port)
      setStatus('success')
      dispatch({ type: 'STEP_COMPLETE', step: 'install', codexStatus: latestStatus })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Codex CLI install failed.'
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
            source={isDark ? Assets.codexWhite : Assets.codexBlack}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: colors.text }]}>Install Codex CLI</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            PocketDev will install Codex system-wide and store the detected binary path for future task launches.
          </Text>
        </View>

        <View style={[styles.planCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.commandHeader}>
            <TerminalSquare color={colors.primary} size={18} strokeWidth={2.25} />
            <Text style={[styles.commandLabel, { color: colors.text }]}>Install command</Text>
          </View>
          <View style={[styles.commandBlock, { backgroundColor: colors.background }]}>
            <Text style={[styles.commandText, { color: colors.text }]} selectable>
              $ {INSTALL_COMMAND}
            </Text>
          </View>
          <Text style={[styles.commandHint, { color: colors.textTertiary }]}>
            This uses the server's system npm, then refreshes the stored Codex tool record.
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
              <Text style={[styles.statusTitle, { color: colors.text }]}>Installing Codex CLI...</Text>
            </View>
          ) : status === 'success' ? (
            <View style={styles.statusRow}>
              <CheckCircle color="#22c55e" size={18} strokeWidth={2.25} />
              <Text style={[styles.statusTitle, { color: colors.text }]}>Codex CLI installed</Text>
            </View>
          ) : status === 'failed' ? (
            <View style={styles.statusRow}>
              <RefreshCw color={colors.error} size={18} strokeWidth={2.25} />
              <Text style={[styles.statusTitle, { color: colors.text }]}>Install failed</Text>
            </View>
          ) : (
            <Text style={[styles.statusTitle, { color: colors.text }]}>Ready to install</Text>
          )}

          {version && (
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>Detected version: v{version}</Text>
          )}
          {installPath && (
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>Path: {installPath}</Text>
          )}
          {error && (
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          )}
          {output && (
            <View style={[styles.outputBox, { backgroundColor: colors.background }]}>
              <Text style={[styles.outputText, { color: colors.textSecondary }]} selectable>
                {output}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {(status === 'idle' || status === 'failed') && (
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          onPress={handleInstall}
          activeOpacity={0.7}
        >
          {status === 'failed' ? (
            <>
              <RefreshCw color={colors.primaryText} size={18} strokeWidth={2.25} />
              <Text style={[styles.buttonText, { color: colors.primaryText }]}>Retry install</Text>
            </>
          ) : (
            <>
              <Text style={[styles.buttonText, { color: colors.primaryText }]}>Install Codex</Text>
              <ArrowRight color={colors.primaryText} size={18} strokeWidth={2.25} />
            </>
          )}
        </TouchableOpacity>
      )}
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
    ...typographyScale.xl,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    ...typographyScale.sm,
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
    ...typographyScale.base,
    fontWeight: '700',
  },
  commandBlock: {
    borderRadius: borderRadius.md,
    padding: spacing[3],
  },
  commandText: {
    ...typographyScale.sm,
    fontFamily: 'monospace',
  },
  commandHint: {
    ...typographyScale.xs,
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
    ...typographyScale.base,
    fontWeight: '700',
  },
  metaText: {
    ...typographyScale.sm,
    lineHeight: 20,
  },
  errorText: {
    ...typographyScale.sm,
    lineHeight: 20,
  },
  outputBox: {
    borderRadius: borderRadius.md,
    padding: spacing[3],
  },
  outputText: {
    ...typographyScale.xs,
    fontFamily: 'monospace',
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
    ...typographyScale.base,
    fontWeight: '600',
  },
})
