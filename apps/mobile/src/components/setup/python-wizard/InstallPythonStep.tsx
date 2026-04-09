import React, { useEffect, useRef, useState } from 'react'
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useTerminalCommand } from '../../../hooks/useTerminalCommand'
import SudoPrompt from '../SudoPrompt'
import { Assets } from '../../../../assets'
import { ArrowRight, Download, RefreshCw } from 'lucide-react-native'
import SetupCommandCard from '../shared/SetupCommandCard'
import SetupProgressCard from '../shared/SetupProgressCard'
import SetupTerminalPanel from '../shared/SetupTerminalPanel'
import { playInstallSuccessHaptic } from '../shared/haptics'

const INSTALL_COMMANDS = [
  'sudo apt update',
  'sudo apt install -y python3',
]

const DONE_MARKER = '__PYINSTALL_DONE__'

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'install' }
  | { type: 'STEP_FAILED'; step: 'install'; error: string }

interface Props {
  dispatch: (action: WizardAction) => void
}

export default function InstallPythonStep({ dispatch }: Props) {
  const { colors, isDark } = useTheme()
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
    errorPatterns: [/^E: /m, /Unable to locate package/im],
    onOutput: (chunk, _fullOutput) => {
      if (chunk.includes(DONE_MARKER) && !chunk.includes('echo')) {
        setSuccess(true)
      }
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50)
    },
  })

  function handleStart() {
    setStarted(true)
    const chainedCmd = INSTALL_COMMANDS.join(' && ')
    const fullCmd = `cd / && ( ${chainedCmd} ) && echo ${DONE_MARKER} || echo PYINSTALL_FAILED`
    sendCommand(fullCmd)
  }

  function handleContinue() {
    dispatch({ type: 'STEP_COMPLETE', step: 'install' })
  }

  function handleRetry() {
    setSuccess(false)
    handleStart()
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.iconRow}>
        <Image
          source={isDark ? Assets.pythonWhite : Assets.pythonBlack}
          style={styles.headerLogo}
          resizeMode="contain"
        />
      </View>

      <Text style={[styles.title, { color: colors.text }]}>Install Python</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Install Python 3 on your server.
      </Text>

      {/* Info card — before starting */}
      {!started && (
        <>
          <SetupCommandCard
            description={(
              <>
                This will install the Python 3 interpreter on your server. The binary will be available as{' '}
                <Text style={styles.mono}>python3</Text>.
              </>
            )}
            commands={INSTALL_COMMANDS}
          />

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={handleStart}
            activeOpacity={0.7}
          >
            <Download color={colors.primaryText} size={18} strokeWidth={2.25} />
            <Text style={[styles.buttonText, { color: colors.primaryText }]}>Install Python</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Running / completed state */}
      {started && (
        <>
          {!success && !hasError && (
            <SetupProgressCard tone="running" message="Installing Python..." />
          )}

          {success && (
            <SetupProgressCard tone="success" message="Python installed" />
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
