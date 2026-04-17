import React, { useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius } from '@pocketdev/shared/theme'
import { typeStyles } from '../../../theme/typography'
import { useTerminalCommand } from '../../../hooks/useTerminalCommand'
import SudoPrompt from '../SudoPrompt'
import { ArrowRight, Package, RefreshCw } from 'lucide-react-native'
import SetupCommandCard from '../shared/SetupCommandCard'
import SetupProgressCard from '../shared/SetupProgressCard'
import SetupTerminalPanel from '../shared/SetupTerminalPanel'
import { playInstallSuccessHaptic } from '../shared/haptics'

const DONE_MARKER = '__PIP_DONE__'

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'install-pip' }
  | { type: 'STEP_FAILED'; step: 'install-pip'; error: string }

interface Props {
  dispatch: (action: WizardAction) => void
  pythonBin: string
}

export default function InstallPipStep({ dispatch, pythonBin }: Props) {
  const INSTALL_COMMAND = `${pythonBin} -m ensurepip --upgrade 2>&1 || (curl -sS -o /tmp/get-pip.py https://bootstrap.pypa.io/get-pip.py && ${pythonBin} /tmp/get-pip.py --break-system-packages)`
  const DISPLAY_COMMAND = `${pythonBin} -m ensurepip || get-pip.py`
  const { colors } = useTheme()
  const [started, setStarted] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showOutput, setShowOutput] = useState(false)
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    if (success) {
      playInstallSuccessHaptic()
    }
  }, [success])

  const {
    output, hasError, showSudoPrompt,
    sendCommand, submitSudoPassword, cancelSudoPrompt,
  } = useTerminalCommand({
    persistent: true,
    errorPatterns: [/permission denied/im, /Could not install/im, /PIP_FAILED/],
    onOutput: (chunk, _fullOutput) => {
      if (chunk.includes(DONE_MARKER) && !chunk.includes('echo')) {
        setSuccess(true)
      }
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50)
    },
  })

  function handleStart() {
    setStarted(true)
    sendCommand(`cd / && ( ${INSTALL_COMMAND} ) && echo ${DONE_MARKER} || echo PIP_FAILED`)
  }

  function handleContinue() {
    dispatch({ type: 'STEP_COMPLETE', step: 'install-pip' })
  }

  function handleRetry() {
    setSuccess(false)
    handleStart()
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.iconRow}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
          <Package color={colors.primary} size={24} strokeWidth={2} />
        </View>
      </View>

      <Text style={[styles.title, { color: colors.text }]}>Install pip</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Set up pip, Python's package installer.
      </Text>

      {/* Info card — before starting */}
      {!started && (
        <>
          <SetupCommandCard
            description="pip is Python's standard package manager. This step bootstraps pip using ensurepip or, if unavailable, the official get-pip.py installer."
            commands={[DISPLAY_COMMAND]}
          />

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={handleStart}
            activeOpacity={0.7}
          >
            <Package color={colors.primaryText} size={18} strokeWidth={2.25} />
            <Text style={[styles.buttonText, { color: colors.primaryText }]}>Install pip</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Running / completed state */}
      {started && (
        <>
          {!success && !hasError && (
            <SetupProgressCard tone="running" message="Installing pip..." />
          )}

          {success && (
            <SetupProgressCard tone="success" message="pip installed" />
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
  iconRow: {
    alignItems: 'center',
    marginTop: spacing[4],
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typeStyles.screenTitle,
    textAlign: 'center',
  },
  subtitle: {
    ...typeStyles.bodySmall,
    textAlign: 'center',
    paddingHorizontal: spacing[4],
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[3],
  },
  infoText: {
    ...typeStyles.bodySmall,
  },
  commandText: {
    ...typeStyles.mono,
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
    ...typeStyles.button,
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
    maxHeight: 150,
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
