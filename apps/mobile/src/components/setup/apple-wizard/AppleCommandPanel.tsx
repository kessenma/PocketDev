import React, { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { spacing, borderRadius } from '@pocketdev/shared/theme'
import { useTheme } from '../../../contexts/ThemeContext'
import { typeStyles } from '../../../theme/typography'
import SetupProgressCard from '../shared/SetupProgressCard'
import SetupTerminalPanel from '../shared/SetupTerminalPanel'
import SudoPrompt from '../SudoPrompt'
import SecureInputPrompt from '../SecureInputPrompt'
import type { AppleCommandRunner } from './useAppleCommand'

interface Props {
  runner: AppleCommandRunner
  runningMessage: string
  successMessage: string
  failureMessage: string
  /** Shown under the progress card while the command runs */
  runningHint?: string
}

/** Progress, terminal output and the sudo / Apple sign-in prompts for one wizard command. */
export default function AppleCommandPanel({ runner, runningMessage, successMessage, failureMessage, runningHint }: Props) {
  const { colors } = useTheme()
  const [showOutput, setShowOutput] = useState(true)
  const { runState } = runner

  return (
    <>
      {runState !== 'idle' && (
        <View style={styles.status}>
          {runState === 'running' && <SetupProgressCard tone="running" message={runningMessage} />}
          {runState === 'ok' && <SetupProgressCard tone="success" message={successMessage} />}
          {runState === 'fail' && <SetupProgressCard tone="error" message={failureMessage} />}
          {runState === 'cancelled' && <SetupProgressCard tone="warning" message="Stopped" />}
          {runState === 'running' && runningHint ? (
            <Text style={[styles.hint, { color: colors.textSecondary }]}>{runningHint}</Text>
          ) : null}
          {runState === 'running' && (
            <TouchableOpacity
              style={[styles.stopButton, { borderColor: colors.border }]}
              onPress={runner.stop}
              activeOpacity={0.7}
            >
              <Text style={[styles.stopText, { color: colors.textSecondary }]}>Stop</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {runState !== 'idle' && (
        <SetupTerminalPanel
          visible={showOutput}
          onToggle={() => setShowOutput(!showOutput)}
          output={runner.output}
          scrollRef={runner.scrollRef}
        />
      )}

      <SudoPrompt
        visible={runner.showSudoPrompt}
        onSubmit={runner.submitSudoPassword}
        onCancel={runner.cancelSudo}
      />
      <SecureInputPrompt
        prompt={runner.securePrompt}
        onSubmit={runner.submitSecurePrompt}
        onCancel={runner.cancelPrompt}
      />
    </>
  )
}

const styles = StyleSheet.create({
  status: {
    gap: spacing[2],
  },
  hint: {
    ...typeStyles.meta,
    paddingHorizontal: spacing[1],
  },
  stopButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  stopText: {
    ...typeStyles.bodySmall,
    fontWeight: '600',
  },
})
