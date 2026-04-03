import React, { useRef, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useConnectionStore } from '../../stores/connection'
import { useSetupStore } from '../../stores/setup'
import { useTerminalCommand } from '../../hooks/useTerminalCommand'
import SudoPrompt from './SudoPrompt'
import TerminalView, { type TerminalViewRef } from '../shared/TerminalView'
import type { ToolCheck } from '@pocketdev/shared/types'

interface Props {
  visible: boolean
  tool: ToolCheck | null
  command: string | null
  onClose: () => void
  onAiInspect: (command: string, output: string) => void
}

/** Patterns that indicate a command failure */
const ERROR_PATTERNS = [
  /^E: /m,
  /^error:/im,
  /^fatal:/im,
  /permission denied/im,
  /command not found/im,
  /no such file or directory/im,
]

export default function InstallSheet({ visible, tool, command, onClose, onAiInspect }: Props) {
  const { colors } = useTheme()
  const ws = useConnectionStore((s) => s.ws)
  const report = useSetupStore((s) => s.report)
  const fetchPrerequisites = useSetupStore((s) => s.fetchPrerequisites)
  const terminalRef = useRef<TerminalViewRef>(null)

  const {
    output, hasError, showSudoPrompt,
    sendCommand, submitSudoPassword, cancelSudoPrompt, reset, disconnect,
  } = useTerminalCommand({
    initialCommand: command ?? undefined,
    errorPatterns: ERROR_PATTERNS,
    onOutput: () => setTimeout(() => terminalRef.current?.scrollToEnd(), 50),
  })

  // Check if any AI CLI is authenticated for AI assist
  const hasAuthenticatedCli = report?.tools.some(
    (t) =>
      (t.id === 'claude_cli' || t.id === 'codex_cli') &&
      t.status === 'installed' &&
      t.auth_status === 'authenticated',
  ) ?? false

  function handleDone() {
    disconnect()
    fetchPrerequisites()
    onClose()
  }

  function handleRetry() {
    reset()
    if (command) sendCommand(command)
  }

  function handleAiInspect() {
    if (command) {
      onAiInspect(command, output)
    }
  }

  const handleAiAssist = useCallback(
    (prompt: string, terminalOutput: string) => {
      if (!ws || !command) return

      // Determine which agent to use
      const agentType = report?.tools.find(
        (t) => t.id === 'claude_cli' && t.status === 'installed' && t.auth_status === 'authenticated',
      )
        ? 'claude'
        : 'codex'

      const outputLines = terminalOutput.split('\n').slice(-50).join('\n')

      const fullPrompt = `I'm running a setup command on my server and need help.

Command: ${command}
Tool: ${tool?.name ?? 'unknown'}

User question: ${prompt}

Recent terminal output:
${outputLines}`

      ws.send('task.start', { prompt: fullPrompt, agentType })

      // Also open the AI inspect view so user can see the AI response
      onAiInspect(command, terminalOutput)
    },
    [ws, command, tool, report, onAiInspect],
  )

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleDone}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            {tool?.name ?? 'Workspace Action'}
          </Text>
          <TouchableOpacity onPress={handleDone}>
            <Text style={[styles.doneButton, { color: colors.primary }]}>Done</Text>
          </TouchableOpacity>
        </View>

        {command && (
          <View style={[styles.commandBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.commandText, { color: colors.textSecondary }]} numberOfLines={1}>
              Guided setup is running for this tool
            </Text>
          </View>
        )}

        <View style={styles.terminalWrapper}>
          <TerminalView
            ref={terminalRef}
            output={output}
            placeholder="Connecting..."
            onAiAssist={handleAiAssist}
            aiAssistAvailable={hasAuthenticatedCli}
          />
        </View>

        {hasError && (
          <View style={[styles.errorBar, { backgroundColor: colors.errorBackground }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>
              This step may need attention
            </Text>
            <View style={styles.errorActions}>
              <TouchableOpacity
                style={[styles.errorButton, { backgroundColor: colors.surface }]}
                onPress={handleRetry}
              >
                <Text style={[styles.errorButtonText, { color: colors.text }]}>Try Again</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.errorButton, { backgroundColor: colors.primary }]}
                onPress={handleAiInspect}
              >
                <Text style={[styles.errorButtonText, { color: colors.primaryText }]}>Ask AI</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <SudoPrompt
          visible={showSudoPrompt}
          onSubmit={submitSudoPassword}
          onCancel={cancelSudoPrompt}
        />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[12],
    paddingBottom: spacing[3],
  },
  title: {
    ...typographyScale.lg,
    fontWeight: '700',
  },
  doneButton: {
    ...typographyScale.base,
    fontWeight: '600',
  },
  commandBar: {
    marginHorizontal: spacing[4],
    padding: spacing[3],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    marginBottom: spacing[2],
  },
  commandText: {
    ...typographyScale.sm,
    fontFamily: 'monospace',
  },
  terminalWrapper: {
    flex: 1,
    marginHorizontal: spacing[4],
  },
  errorBar: {
    margin: spacing[4],
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
  },
  errorText: {
    ...typographyScale.sm,
    fontWeight: '600',
  },
  errorActions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  errorButton: {
    flex: 1,
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  errorButtonText: {
    ...typographyScale.sm,
    fontWeight: '600',
  },
})
