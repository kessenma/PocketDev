import React, { useState, useEffect, useRef, useCallback } from 'react'
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
import { buildTerminalWsUrl } from '../../services/api'
import { buildPocketDevAuthorizationHeader } from '../../services/auth'
import { createReactNativeWebSocket } from '../../services/websocket'
import { getSudoPassword, saveSudoPassword } from '../../services/secure-storage'
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

const SUDO_PROMPT_PATTERN = /\[sudo\] password for/

export default function InstallSheet({ visible, tool, command, onClose, onAiInspect }: Props) {
  const { colors } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const ws = useConnectionStore((s) => s.ws)
  const report = useSetupStore((s) => s.report)
  const fetchPrerequisites = useSetupStore((s) => s.fetchPrerequisites)

  const [output, setOutput] = useState('')
  const [hasError, setHasError] = useState(false)
  const [showSudoPrompt, setShowSudoPrompt] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const terminalRef = useRef<TerminalViewRef>(null)

  // Check if any AI CLI is authenticated for AI assist
  const hasAuthenticatedCli = report?.tools.some(
    (t) =>
      (t.id === 'claude_cli' || t.id === 'codex_cli') &&
      t.status === 'installed' &&
      t.auth_status === 'authenticated',
  ) ?? false

  // Connect terminal WebSocket when sheet opens
  useEffect(() => {
    if (!visible || !server || !command) return

    let cancelled = false

    ;(async () => {
      const url = buildTerminalWsUrl(server.ip, server.port)
      const authHeader = await buildPocketDevAuthorizationHeader()
      const termWs = createReactNativeWebSocket(url, { Authorization: authHeader })
      if (cancelled) { termWs.close(); return }

      wsRef.current = termWs

      setOutput('')
      setHasError(false)

      termWs.onopen = () => {
        termWs.send(JSON.stringify({ type: 'terminal.input', data: command + '\n' }))
      }

      termWs.onmessage = (event) => {
        let text: string
        try {
          const msg = JSON.parse(event.data as string)
          if (msg.type === 'terminal.output') text = msg.data
          else if (msg.type === 'terminal.exited') { text = `\n[Process exited: ${msg.exitCode}]\n` }
          else return
        } catch {
          text = event.data as string
        }

        setOutput((prev) => {
          const updated = prev + text

          if (SUDO_PROMPT_PATTERN.test(text)) {
            handleSudoNeeded()
          }

          for (const pattern of ERROR_PATTERNS) {
            if (pattern.test(text)) {
              setHasError(true)
              break
            }
          }

          return updated
        })

        setTimeout(() => terminalRef.current?.scrollToEnd(), 50)
      }

      termWs.onclose = () => {
        wsRef.current = null
      }
    })()

    return () => {
      cancelled = true
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [visible, server, command])

  const handleSudoNeeded = useCallback(async () => {
    if (!server) return

    const stored = await getSudoPassword(server.ip)
    if (stored && wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'terminal.input', data: stored + '\n' }))
      return
    }

    setShowSudoPrompt(true)
  }, [server])

  function handleSudoSubmit(password: string, remember: boolean) {
    setShowSudoPrompt(false)
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'terminal.input', data: password + '\n' }))
    }
    if (remember && server) {
      saveSudoPassword(server.ip, password)
    }
  }

  function handleDone() {
    wsRef.current?.close()
    fetchPrerequisites()
    onClose()
  }

  function handleRetry() {
    setHasError(false)
    if (wsRef.current && command) {
      wsRef.current.send(JSON.stringify({ type: 'terminal.input', data: command + '\n' }))
    }
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
            {tool?.name ?? 'Terminal'}
          </Text>
          <TouchableOpacity onPress={handleDone}>
            <Text style={[styles.doneButton, { color: colors.primary }]}>Done</Text>
          </TouchableOpacity>
        </View>

        {command && (
          <View style={[styles.commandBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.commandText, { color: colors.textSecondary }]} numberOfLines={1}>
              $ {command}
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
              Command may have failed
            </Text>
            <View style={styles.errorActions}>
              <TouchableOpacity
                style={[styles.errorButton, { backgroundColor: colors.surface }]}
                onPress={handleRetry}
              >
                <Text style={[styles.errorButtonText, { color: colors.text }]}>Retry</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.errorButton, { backgroundColor: colors.primary }]}
                onPress={handleAiInspect}
              >
                <Text style={[styles.errorButtonText, { color: colors.primaryText }]}>AI Inspect</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <SudoPrompt
          visible={showSudoPrompt}
          onSubmit={handleSudoSubmit}
          onCancel={() => setShowSudoPrompt(false)}
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
