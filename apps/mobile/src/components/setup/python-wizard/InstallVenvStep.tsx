import React, { useState, useRef } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useTerminalCommand } from '../../../hooks/useTerminalCommand'
import SudoPrompt from '../SudoPrompt'
import { FolderOpen, CheckCircle, RefreshCw, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react-native'

const INSTALL_COMMAND = 'sudo apt install -y python3.13-venv'
const DONE_MARKER = '__VENV_DONE__'

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'install-venv' }
  | { type: 'STEP_FAILED'; step: 'install-venv'; error: string }

interface Props {
  dispatch: (action: WizardAction) => void
}

export default function InstallVenvStep({ dispatch }: Props) {
  const { colors } = useTheme()
  const [started, setStarted] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showOutput, setShowOutput] = useState(false)
  const scrollRef = useRef<ScrollView>(null)

  const {
    output, hasError, showSudoPrompt,
    sendCommand, submitSudoPassword, cancelSudoPrompt,
  } = useTerminalCommand({
    persistent: true,
    errorPatterns: [/^E: /m, /Unable to locate package/im],
    onOutput: (_chunk, fullOutput) => {
      if (fullOutput.includes(DONE_MARKER)) {
        setSuccess(true)
      }
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50)
    },
  })

  function handleStart() {
    setStarted(true)
    sendCommand(`( ${INSTALL_COMMAND} ) && echo ${DONE_MARKER} || echo VENV_FAILED`)
  }

  function handleContinue() {
    dispatch({ type: 'STEP_COMPLETE', step: 'install-venv' })
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
          <FolderOpen color={colors.primary} size={24} strokeWidth={2} />
        </View>
      </View>

      <Text style={[styles.title, { color: colors.text }]}>Virtual Environments</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Install the venv module for creating isolated Python environments.
      </Text>

      {/* Info card — before starting */}
      {!started && (
        <>
          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              The venv module lets you create self-contained Python environments for each project, keeping dependencies isolated.
            </Text>
            <Text style={[styles.commandText, { color: colors.textTertiary }]}>
              $ {INSTALL_COMMAND}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={handleStart}
            activeOpacity={0.7}
          >
            <FolderOpen color={colors.primaryText} size={18} strokeWidth={2.25} />
            <Text style={[styles.buttonText, { color: colors.primaryText }]}>Install venv</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Running / completed state */}
      {started && (
        <>
          {!success && !hasError && (
            <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
              <Text style={[styles.statusText, { color: colors.primary }]}>
                Installing python3.13-venv...
              </Text>
            </View>
          )}

          {success && (
            <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: '#22c55e' }]}>
              <CheckCircle color="#22c55e" size={18} strokeWidth={2.25} />
              <Text style={[styles.statusText, { color: '#22c55e' }]}>
                venv module installed
              </Text>
            </View>
          )}

          {hasError && (
            <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.error }]}>
              <Text style={[styles.statusText, { color: colors.error }]}>
                Installation failed
              </Text>
            </View>
          )}

          {/* Collapsible terminal output */}
          <TouchableOpacity
            style={[styles.outputToggle, { borderColor: colors.border }]}
            onPress={() => setShowOutput(!showOutput)}
            activeOpacity={0.7}
          >
            <Text style={[styles.outputToggleText, { color: colors.textTertiary }]}>
              Terminal output
            </Text>
            {showOutput
              ? <ChevronUp color={colors.textTertiary} size={16} strokeWidth={2} />
              : <ChevronDown color={colors.textTertiary} size={16} strokeWidth={2} />}
          </TouchableOpacity>

          {showOutput && (
            <ScrollView
              ref={scrollRef}
              style={[styles.outputBox, { backgroundColor: colors.background }]}
              nestedScrollEnabled
            >
              <Text style={[styles.outputText, { color: colors.textSecondary }]} selectable>
                {output || 'Waiting for output...'}
              </Text>
            </ScrollView>
          )}

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
