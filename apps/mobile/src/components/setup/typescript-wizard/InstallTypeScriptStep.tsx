import React, { useState, useRef, useEffect } from 'react'
import { View, Text, Image, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useTerminalCommand } from '../../../hooks/useTerminalCommand'
import { useConnectionStore } from '../../../stores/connection'
import { fetchTypeScriptSetupStatus } from '../../../services/api'
import SudoPrompt from '../SudoPrompt'
import { Assets } from '../../../../assets'
import { ArrowRight, Check, Download, RefreshCw } from 'lucide-react-native'
import type { TypeScriptSetupStatus } from '@pocketdev/shared/types'
import SetupCommandCard from '../shared/SetupCommandCard'
import SetupProgressCard from '../shared/SetupProgressCard'
import SetupTerminalPanel from '../shared/SetupTerminalPanel'

const DISPLAY_CMD = 'npm install -g typescript'
const DONE_MARKER = '__TS_INSTALL_DONE__'

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'install' }
  | { type: 'STEP_FAILED'; step: 'install'; error: string }

interface Props {
  dispatch: (action: WizardAction) => void
}

export default function InstallTypeScriptStep({ dispatch }: Props) {
  const { colors, isDark } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const [checking, setChecking] = useState(true)
  const [existingTs, setExistingTs] = useState<TypeScriptSetupStatus | null>(null)
  const [started, setStarted] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showOutput, setShowOutput] = useState(false)
  const scrollRef = useRef<ScrollView>(null)

  // Pre-check: is TypeScript already installed?
  useEffect(() => {
    if (!server) { setChecking(false); return }
    fetchTypeScriptSetupStatus(server.ip, server.port)
      .then((status) => { if (status.installed) setExistingTs(status) })
      .catch(() => {})
      .finally(() => setChecking(false))
  }, [server])

  const {
    output, hasError, showSudoPrompt,
    sendCommand, submitSudoPassword, cancelSudoPrompt,
  } = useTerminalCommand({
    persistent: true,
    errorPatterns: [/npm ERR!/im, /EACCES/im],
    onOutput: (chunk) => {
      if (chunk.includes(DONE_MARKER) && !chunk.includes('echo')) {
        setSuccess(true)
      }
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50)
    },
  })

  function handleStart() {
    setStarted(true)
    const fullCmd = `cd ~ && npm install -g typescript && echo ${DONE_MARKER} || echo TS_INSTALL_FAILED`
    sendCommand(fullCmd)
  }

  function handleSkip() {
    dispatch({ type: 'STEP_COMPLETE', step: 'install' })
  }

  function handleContinue() {
    dispatch({ type: 'STEP_COMPLETE', step: 'install' })
  }

  function handleRetry() {
    setSuccess(false)
    handleStart()
  }

  if (checking) {
    return (
      <View style={styles.checkingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Checking for existing TypeScript installation...</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.iconRow}>
        <Image
          source={isDark ? Assets.typescriptWhite : Assets.typescriptBlack}
          style={styles.headerLogo}
          resizeMode="contain"
        />
      </View>

      <Text style={[styles.title, { color: colors.text }]}>Install TypeScript</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {existingTs
          ? 'TypeScript is already installed. You can skip this step or reinstall.'
          : 'Install the TypeScript compiler globally via npm.'}
      </Text>

      {/* Already installed notice */}
      {existingTs && !started && (
        <View style={[styles.existingCard, { backgroundColor: '#22c55e18', borderColor: '#22c55e44' }]}>
          <View style={styles.existingHeader}>
            <Check color="#22c55e" size={18} strokeWidth={2.5} />
            <Text style={[styles.existingTitle, { color: '#22c55e' }]}>
              TypeScript {existingTs.version} is already installed
            </Text>
          </View>
          {existingTs.path && (
            <Text style={[styles.existingDetail, { color: colors.textTertiary }]}>
              {existingTs.path}
            </Text>
          )}
        </View>
      )}

      {!started && (
        <>
          {!existingTs && (
            <SetupCommandCard
              description={(
                <>
                  This will install the <Text style={styles.mono}>tsc</Text> compiler globally via npm.
                </>
              )}
              commands={[DISPLAY_CMD]}
            />
          )}

          {existingTs ? (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary, flex: 1 }]}
                onPress={handleSkip}
                activeOpacity={0.7}
              >
                <ArrowRight color={colors.primaryText} size={18} strokeWidth={2.25} />
                <Text style={[styles.buttonText, { color: colors.primaryText }]}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.border, flex: 1 }]}
                onPress={handleStart}
                activeOpacity={0.7}
              >
                <Download color={colors.text} size={16} strokeWidth={2.25} />
                <Text style={[styles.buttonText, { color: colors.text }]}>Reinstall</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={handleStart}
              activeOpacity={0.7}
            >
              <Download color={colors.primaryText} size={18} strokeWidth={2.25} />
              <Text style={[styles.buttonText, { color: colors.primaryText }]}>Install TypeScript</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {started && (
        <>
          {!success && !hasError && (
            <SetupProgressCard tone="running" message="Installing TypeScript..." />
          )}

          {success && (
            <SetupProgressCard tone="success" message="TypeScript installed" />
          )}

          {hasError && (
            <SetupProgressCard tone="error" message="Installation failed" />
          )}

          <SetupTerminalPanel
            visible={showOutput}
            onToggle={() => setShowOutput(!showOutput)}
            output={output}
            scrollRef={scrollRef}
          />

          {success && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={handleContinue}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, { color: colors.primaryText }]}>Continue</Text>
              <ArrowRight color={colors.primaryText} size={18} strokeWidth={2.25} />
            </TouchableOpacity>
          )}

          {hasError && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.error }]}
              onPress={handleRetry}
              activeOpacity={0.7}
            >
              <RefreshCw color="#fff" size={16} strokeWidth={2.25} />
              <Text style={[styles.buttonText, { color: '#fff' }]}>Retry</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      <SudoPrompt
        visible={showSudoPrompt}
        onSubmit={submitSudoPassword}
        onCancel={cancelSudoPrompt}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    gap: spacing[3],
    paddingBottom: spacing[6],
  },
  checkingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[4],
  },
  iconRow: {
    alignItems: 'center',
    marginTop: spacing[4],
  },
  headerLogo: {
    width: 48,
    height: 48,
  },
  title: {
    ...typographyScale.xl,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    ...typographyScale.sm,
    textAlign: 'center',
    paddingHorizontal: spacing[4],
  },
  existingCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[2],
  },
  existingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  existingTitle: {
    ...typographyScale.sm,
    fontWeight: '600',
  },
  existingDetail: {
    ...typographyScale.xs,
    fontFamily: 'monospace',
    marginLeft: 26,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[3],
  },
  infoText: {
    ...typographyScale.sm,
    lineHeight: 20,
  },
  mono: {
    fontFamily: 'monospace',
  },
  commandList: {
    gap: spacing[1],
  },
  commandText: {
    ...typographyScale.xs,
    fontFamily: 'monospace',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
  },
  statusText: {
    ...typographyScale.sm,
    fontWeight: '600',
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
    ...typographyScale.xs,
    fontWeight: '500',
  },
  outputBox: {
    maxHeight: 150,
    borderRadius: borderRadius.md,
    padding: spacing[3],
  },
  outputText: {
    ...typographyScale.xs,
    fontFamily: 'monospace',
    lineHeight: 16,
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
