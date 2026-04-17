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

const PPA_COMMANDS = [
  'sudo apt update',
  'sudo apt install -y software-properties-common',
  'sudo add-apt-repository -y ppa:deadsnakes/ppa',
]

const DONE_MARKER = '__PPA_DONE__'
const FAIL_PATTERN = /^E: /m

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'add-ppa' }
  | { type: 'STEP_FAILED'; step: 'add-ppa'; error: string }

interface Props {
  dispatch: (action: WizardAction) => void
}

export default function AddPpaStep({ dispatch }: Props) {
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
    errorPatterns: [FAIL_PATTERN],
    onOutput: (chunk, _fullOutput) => {
      if (chunk.includes(DONE_MARKER) && !chunk.includes('echo')) {
        setSuccess(true)
      }
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50)
    },
  })

  function handleStart() {
    setStarted(true)
    // Chain all commands and add a done marker
    const chainedCmd = PPA_COMMANDS.join(' && ')
    sendCommand(`cd / && ( ${chainedCmd} ) && echo ${DONE_MARKER} || echo PPA_FAILED`)
  }

  function handleContinue() {
    dispatch({ type: 'STEP_COMPLETE', step: 'add-ppa' })
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

      <Text style={[styles.title, { color: colors.text }]}>Add Python PPA</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Add the deadsnakes PPA to get the latest Python 3.13 packages.
      </Text>

      {/* Info card — before starting */}
      {!started && (
        <>
          <SetupCommandCard
            description="Ubuntu's default repositories may not include the latest Python. The deadsnakes PPA is a trusted source maintained by the Python community for newer releases."
            commands={PPA_COMMANDS}
          />

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={handleStart}
            activeOpacity={0.7}
          >
            <Package color={colors.primaryText} size={18} strokeWidth={2.25} />
            <Text style={[styles.buttonText, { color: colors.primaryText }]}>Add PPA</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Running / completed state */}
      {started && (
        <>
          {/* Status message */}
          {!success && !hasError && (
            <SetupProgressCard tone="running" message="Setting up deadsnakes PPA..." />
          )}

          {success && (
            <SetupProgressCard tone="success" message="PPA added successfully" />
          )}

          {hasError && (
            <SetupProgressCard tone="error" message="Failed to add PPA" />
          )}

          <SetupTerminalPanel
            visible={showOutput}
            onToggle={() => setShowOutput(!showOutput)}
            output={output}
            scrollRef={scrollRef}
          />

          {/* Actions */}
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
  commandList: {
    gap: spacing[1],
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
