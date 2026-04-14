import React, { useRef } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput } from 'react-native'
import { spacing, borderRadius } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { useTerminalCommand } from '../../hooks/useTerminalCommand'
import TerminalView, { type TerminalViewRef } from '../shared/TerminalView'
import { typeStyles } from '../../theme/typography'
import { useSetupStore } from '../../stores/setup'
import type { PrerequisitesReport } from '@pocketdev/shared/types'

function formatToolsContext(report: PrerequisitesReport | null): string {
  if (!report?.tools?.length) return ''
  const installed = report.tools.filter((t) => t.status === 'installed')
  if (!installed.length) return ''
  const lines = installed.map((t) => {
    const version = t.version ? ` ${t.version}` : ''
    const path = t.path ? ` (${t.path})` : ''
    return `- ${t.name}${version}${path}`
  })
  return `Server environment (${report.os} ${report.arch}):\n${lines.join('\n')}\n\n`
}

const QUICK_ACTIONS = [
  { label: 'docker ps -a', command: 'docker ps -a' },
  { label: 'compose logs', command: 'docker compose logs --tail=50 2>&1' },
  { label: 'ports', command: 'lsof -i -P -n | grep LISTEN' },
  { label: 'disk', command: 'df -h' },
]

interface Props {
  problemDescription: string
}

export default function DebugTerminalPane({ problemDescription }: Props) {
  const { colors } = useTheme()
  const terminalRef = useRef<TerminalViewRef>(null)
  const [sudoInput, setSudoInput] = React.useState('')
  const report = useSetupStore((s) => s.report)

  const { output, connected, showSudoPrompt, sendCommand, submitSudoPassword, cancelSudoPrompt } =
    useTerminalCommand({ persistent: true })

  function handleAiAssist(prompt: string, terminalOutput: string) {
    const context = terminalOutput.slice(-3000)
    const toolsCtx = formatToolsContext(report)
    const problemCtx = problemDescription.trim()
      ? `Server issue: ${problemDescription.trim()}\n\n`
      : ''
    const fullPrompt = `${toolsCtx}${problemCtx}${prompt}\n\nRecent terminal output:\n${context}`
    // Escape single quotes in the prompt to prevent shell injection
    const escaped = fullPrompt.replace(/'/g, "'\\''")
    sendCommand(`claude --print '${escaped}'`)
  }

  return (
    <View style={styles.container}>
      {/* Connection status */}
      <View style={styles.statusBar}>
        <View style={[styles.statusDot, { backgroundColor: connected ? '#22c55e' : '#ef4444' }]} />
        <Text style={[typeStyles.meta, { color: colors.textTertiary }]}>
          {connected ? 'Terminal connected' : 'Connecting...'}
        </Text>
      </View>

      {/* Quick action buttons */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.quickScroll}
        contentContainerStyle={styles.quickContent}
      >
        {QUICK_ACTIONS.map((a) => (
          <TouchableOpacity
            key={a.label}
            style={[styles.quickChip, { backgroundColor: colors.panel, borderColor: colors.border }]}
            onPress={() => sendCommand(a.command)}
            disabled={!connected}
            activeOpacity={0.7}
          >
            <Text style={[typeStyles.meta, { color: connected ? colors.text : colors.textTertiary, fontFamily: 'monospace' }]}>
              {a.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Terminal */}
      <View style={styles.terminal}>
        <TerminalView
          ref={terminalRef}
          output={output}
          placeholder="Terminal connecting to server..."
          onAiAssist={handleAiAssist}
          aiAssistAvailable={connected}
        />
      </View>

      {/* Sudo prompt modal */}
      <Modal visible={showSudoPrompt} transparent animationType="slide" onRequestClose={cancelSudoPrompt}>
        <TouchableOpacity style={styles.sudoOverlay} activeOpacity={1} onPress={cancelSudoPrompt}>
          <View
            style={[styles.sudoSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={[typeStyles.sectionTitle, { color: colors.text }]}>sudo password</Text>
            <TextInput
              style={[styles.sudoInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              value={sudoInput}
              onChangeText={setSudoInput}
              secureTextEntry
              autoFocus
              placeholder="Enter sudo password"
              placeholderTextColor={colors.textTertiary}
              returnKeyType="done"
              onSubmitEditing={() => {
                submitSudoPassword(sudoInput, false)
                setSudoInput('')
              }}
            />
            <TouchableOpacity
              style={[styles.sudoSubmit, { backgroundColor: colors.accent }]}
              onPress={() => {
                submitSudoPassword(sudoInput, false)
                setSudoInput('')
              }}
              activeOpacity={0.7}
            >
              <Text style={[typeStyles.bodyStrong, { color: colors.accentText }]}>Submit</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing[2],
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  quickScroll: {
    flexGrow: 0,
  },
  quickContent: {
    gap: spacing[2],
    paddingHorizontal: spacing[1],
  },
  quickChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  terminal: {
    flex: 1,
  },
  sudoOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sudoSheet: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    padding: spacing[5],
    gap: spacing[3],
  },
  sudoInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    ...typeStyles.body,
  },
  sudoSubmit: {
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
})
