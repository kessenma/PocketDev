import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { spacing, borderRadius } from '@pocketdev/shared/theme'
import { typeStyles } from '../../theme/typography'
import { useConnectionStore } from '../../stores/connection'
import { useSetupStore } from '../../stores/setup'
import type { WsMessage } from '@pocketdev/shared/types'
import SetupWizardScreen from './SetupWizardScreen'

interface Props {
  failedCommand: string
  failedOutput: string
  onDismiss: () => void
  onFixCommand: (command: string) => void
}

export default function AiInspectSheet({
  failedCommand,
  failedOutput,
  onDismiss,
  onFixCommand,
}: Props) {
  const { colors } = useTheme()
  const ws = useConnectionStore((s) => s.ws)
  const report = useSetupStore((s) => s.report)

  const [diagnosticOutput, setDiagnosticOutput] = useState('')
  const [taskId, setTaskId] = useState<string | null>(null)
  const [suggestedFix, setSuggestedFix] = useState<string | null>(null)
  const scrollRef = useRef<ScrollView>(null)

  // Check if any AI CLI is authenticated
  const hasAuthenticatedCli = report?.tools.some(
    (t) =>
      (t.id === 'claude_cli' || t.id === 'codex_cli') &&
      t.status === 'installed' &&
      t.auth_status === 'authenticated',
  )

  // Determine which agent to use
  const agentType = report?.tools.find(
    (t) => t.id === 'claude_cli' && t.status === 'installed' && t.auth_status === 'authenticated',
  )
    ? 'claude'
    : 'codex'

  useEffect(() => {
    if (!ws || !hasAuthenticatedCli) return

    setDiagnosticOutput('')
    setTaskId(null)
    setSuggestedFix(null)

    const outputLines = failedOutput.split('\n').slice(-50).join('\n')

    const prompt = `The following install command failed on this server. Diagnose the issue and suggest a fix. If you can suggest a single command to fix it, put it on its own line prefixed with "FIX_COMMAND: ".

Command: ${failedCommand}

Output:
${outputLines}`

    ws.send('task.start', { prompt, agentType })
  }, [ws, hasAuthenticatedCli])

  useEffect(() => {
    const origOnMessage = (ws as any)?._onMessage
    // Simplified: rely on task store to aggregate output
  }, [taskId])

  function handleStop() {
    if (taskId && ws) {
      ws.send('task.kill', { taskId })
    }
    onDismiss()
  }

  function handleFixIt() {
    if (suggestedFix) {
      onFixCommand(suggestedFix)
      onDismiss()
    }
  }

  return (
    <SetupWizardScreen backgroundColor={colors.background} onClose={onDismiss}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>AI Inspect</Text>
        {hasAuthenticatedCli ? (
          <TouchableOpacity onPress={handleStop}>
            <Text style={[styles.doneButton, { color: colors.error }]}>Stop</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={onDismiss}>
            <Text style={[styles.doneButton, { color: colors.primary }]}>Close</Text>
          </TouchableOpacity>
        )}
      </View>

      {!hasAuthenticatedCli ? (
        <View style={styles.center}>
          <Text style={[styles.disabledText, { color: colors.textSecondary }]}>
            AI Inspect requires an authenticated Claude or Codex CLI.
            Complete the CLI setup first.
          </Text>
        </View>
      ) : (
        <>
          <View style={[styles.contextBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.contextLabel, { color: colors.textTertiary }]}>Failed command</Text>
            <Text style={[styles.contextCmd, { color: colors.textSecondary }]} numberOfLines={1}>
              $ {failedCommand}
            </Text>
          </View>

          <ScrollView
            ref={scrollRef}
            style={[styles.output, { backgroundColor: '#1a1a2e' }]}
            contentContainerStyle={styles.outputContent}
          >
            <Text style={styles.outputText} selectable>
              {diagnosticOutput || 'Analyzing failure...'}
            </Text>
          </ScrollView>

          {suggestedFix && (
            <View style={styles.fixBar}>
              <TouchableOpacity
                style={[styles.fixButton, { backgroundColor: colors.primary }]}
                onPress={handleFixIt}
                activeOpacity={0.7}
              >
                <Text style={[styles.fixButtonText, { color: colors.primaryText }]}>
                  Fix It: {suggestedFix}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </SetupWizardScreen>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
  },
  title: {
    ...typeStyles.heading,
  },
  doneButton: {
    ...typeStyles.button,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[8],
  },
  disabledText: {
    ...typeStyles.body,
    textAlign: 'center',
  },
  contextBar: {
    marginHorizontal: spacing[4],
    padding: spacing[3],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    marginBottom: spacing[2],
    gap: 2,
  },
  contextLabel: {
    ...typeStyles.sectionTitle,
  },
  contextCmd: {
    ...typeStyles.mono,
  },
  output: {
    flex: 1,
    marginHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
  },
  outputContent: {
    padding: spacing[3],
    minHeight: '100%',
  },
  outputText: {
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
    color: '#e0e0e0',
  },
  fixBar: {
    padding: spacing[4],
  },
  fixButton: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    alignItems: 'center',
  },
  fixButtonText: {
    ...typeStyles.mono,
  },
})
