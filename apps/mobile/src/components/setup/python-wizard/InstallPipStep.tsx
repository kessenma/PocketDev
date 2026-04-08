import React, { useState, useRef } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useTerminalCommand } from '../../../hooks/useTerminalCommand'
import SudoPrompt from '../SudoPrompt'
import { Package, CheckCircle, RefreshCw, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react-native'
import CopyButton from '../../shared/CopyButton'

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
          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              pip is Python's standard package manager. This step bootstraps pip using ensurepip or, if unavailable, the official get-pip.py installer.
            </Text>
            <Text style={[styles.commandText, { color: colors.textTertiary }]}>
              $ {DISPLAY_COMMAND}
            </Text>
          </View>

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
            <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
              <Text style={[styles.statusText, { color: colors.primary }]}>
                Installing pip...
              </Text>
            </View>
          )}

          {success && (
            <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: '#22c55e' }]}>
              <CheckCircle color="#22c55e" size={18} strokeWidth={2.25} />
              <Text style={[styles.statusText, { color: '#22c55e' }]}>
                pip installed
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
            <>
              <ScrollView
                ref={scrollRef}
                style={[styles.outputBox, { backgroundColor: colors.background }]}
                nestedScrollEnabled
              >
                <Text style={[styles.outputText, { color: colors.textSecondary }]} selectable>
                  {output || 'Waiting for output...'}
                </Text>
              </ScrollView>
              {output ? <CopyButton value={output} label="Copy output" /> : null}
            </>
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
