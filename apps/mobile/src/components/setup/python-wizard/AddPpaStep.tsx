import React, { useState, useRef } from 'react'
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useTerminalCommand } from '../../../hooks/useTerminalCommand'
import SudoPrompt from '../SudoPrompt'
import { Assets } from '../../../../assets'
import { Package, CheckCircle, RefreshCw, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react-native'

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
  const { colors, isDark } = useTheme()
  const [started, setStarted] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showOutput, setShowOutput] = useState(false)
  const scrollRef = useRef<ScrollView>(null)

  const {
    output, hasError, showSudoPrompt,
    sendCommand, submitSudoPassword, cancelSudoPrompt,
  } = useTerminalCommand({
    persistent: true,
    errorPatterns: [FAIL_PATTERN],
    onOutput: (chunk, fullOutput) => {
      if (fullOutput.includes(DONE_MARKER)) {
        setSuccess(true)
      }
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50)
    },
  })

  function handleStart() {
    setStarted(true)
    // Chain all commands and add a done marker
    const chainedCmd = PPA_COMMANDS.join(' && ')
    sendCommand(`( ${chainedCmd} ) && echo ${DONE_MARKER} || echo PPA_FAILED`)
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
          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Ubuntu's default repositories may not include the latest Python. The deadsnakes PPA is a trusted source maintained by the Python community for newer releases.
            </Text>
            <View style={styles.commandList}>
              {PPA_COMMANDS.map((cmd, i) => (
                <Text key={i} style={[styles.commandText, { color: colors.textTertiary }]}>
                  $ {cmd}
                </Text>
              ))}
            </View>
          </View>

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
            <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
              <Text style={[styles.statusText, { color: colors.primary }]}>
                Setting up deadsnakes PPA...
              </Text>
            </View>
          )}

          {success && (
            <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: '#22c55e' }]}>
              <CheckCircle color="#22c55e" size={18} strokeWidth={2.25} />
              <Text style={[styles.statusText, { color: '#22c55e' }]}>
                PPA added successfully
              </Text>
            </View>
          )}

          {hasError && (
            <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.error }]}>
              <Text style={[styles.statusText, { color: colors.error }]}>
                Failed to add PPA
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
