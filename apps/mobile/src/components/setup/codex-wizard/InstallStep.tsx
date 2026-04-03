import React, { useState, useRef } from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useTerminalCommand } from '../../../hooks/useTerminalCommand'
import SudoPrompt from '../SudoPrompt'
import TerminalView, { type TerminalViewRef } from '../../shared/TerminalView'
import { Assets } from '../../../../assets'
import { CheckCircle, RefreshCw } from 'lucide-react-native'

const INSTALL_COMMAND = 'npm i -g @openai/codex'
const ERROR_PATTERNS = [/^E: /m, /^error:/im, /^fatal:/im, /permission denied/im, /npm ERR!/im, /command not found.*npm/im]

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'install' }
  | { type: 'STEP_FAILED'; step: 'install'; error: string }

interface Props {
  dispatch: (action: WizardAction) => void
}

export default function InstallStep({ dispatch }: Props) {
  const { colors, isDark } = useTheme()
  const [npmMissing, setNpmMissing] = useState(false)
  const terminalRef = useRef<TerminalViewRef>(null)

  const {
    output, hasError, done, showSudoPrompt,
    sendCommand, submitSudoPassword, cancelSudoPrompt, reset,
  } = useTerminalCommand({
    initialCommand: INSTALL_COMMAND,
    errorPatterns: ERROR_PATTERNS,
    onOutput: (chunk) => {
      if (/command not found.*npm/im.test(chunk) || /npm: not found/im.test(chunk)) {
        setNpmMissing(true)
      }
      setTimeout(() => terminalRef.current?.scrollToEnd(), 50)
    },
  })

  function handleContinue() {
    dispatch({ type: 'STEP_COMPLETE', step: 'install' })
  }

  function handleRetry() {
    reset()
    setNpmMissing(false)
    sendCommand(INSTALL_COMMAND)
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Image
          source={isDark ? Assets.codexWhite : Assets.codexBlack}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>Install Codex CLI</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Installing via npm...
          </Text>
        </View>
      </View>

      <View style={styles.terminalWrapper}>
        <TerminalView ref={terminalRef} output={output} placeholder="Connecting..." />
      </View>

      {npmMissing && (
        <View style={[styles.hintCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.hintText, { color: colors.textSecondary }]}>
            npm was not found. Make sure Node.js and npm are installed first — check the setup checklist.
          </Text>
        </View>
      )}

      {done && !hasError && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={handleContinue}
          activeOpacity={0.7}
        >
          <CheckCircle color={colors.primaryText} size={18} strokeWidth={2.25} />
          <Text style={[styles.buttonText, { color: colors.primaryText }]}>Continue</Text>
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

      <SudoPrompt
        visible={showSudoPrompt}
        onSubmit={submitSudoPassword}
        onCancel={cancelSudoPrompt}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing[3],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  logo: {
    width: 36,
    height: 36,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typographyScale.xl,
    fontWeight: '700',
  },
  subtitle: {
    ...typographyScale.sm,
  },
  terminalWrapper: {
    flex: 1,
  },
  hintCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
  },
  hintText: {
    ...typographyScale.sm,
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
