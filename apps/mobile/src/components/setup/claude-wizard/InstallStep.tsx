import React, { useState, useEffect, useRef } from 'react'
import { View, Text, Image, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius } from '@pocketdev/shared/theme'
import { typeStyles } from '../../../theme/typography'
import { useTerminalCommand } from '../../../hooks/useTerminalCommand'
import { useConnectionStore } from '../../../stores/connection'
import { fetchClaudeSetupStatus } from '../../../services/api'
import SudoPrompt from '../SudoPrompt'
import { Assets } from '../../../../assets'
import { Check, Clock, RefreshCw, ChevronDown, ChevronUp, AlertCircle, Download } from 'lucide-react-native'
import CopyButton from '../../shared/CopyButton'

// Marker pattern to detect success/failure
const MARKER_OK = '___CLAUDE_INSTALL_OK___'
const MARKER_FAIL = '___CLAUDE_INSTALL_FAIL___'
// Only match marker on its own line — NOT inside the echoed command text.
// The terminal echoes back the full command (which contains the marker strings),
// so we must only match when the marker appears as standalone output.
const MARKER_PATTERN = /^___CLAUDE_INSTALL_(OK|FAIL)___$/m
// Strip ANSI escape codes before marker detection
const ANSI_RE = /\x1b\[[0-9;]*[a-zA-Z]|\x1b\][^\x07]*\x07/g

const INSTALL_COMMAND = 'curl -fsSL https://claude.ai/install.sh | bash'
const TMUX_SESSION = 'claude-install'
// Matches the Claude Code workspace trust prompt
const CLAUDE_TRUST_PATTERN = /Quick safety check|Is this a project you created/i

// Timeout (ms) — if no marker detected, fall back to API check
const FALLBACK_TIMEOUT_MS = 90_000

type ToolInstallStatus = 'queued' | 'installing' | 'done' | 'failed'

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'install' }
  | { type: 'STEP_FAILED'; step: 'install'; error: string }

interface Props {
  dispatch: (action: WizardAction) => void
}

function buildTmuxInstallCommand(): string {
  // Write script via heredoc to avoid quoting issues inside tmux new-session
  const scriptLines = [
    `( ${INSTALL_COMMAND} ) && {`,
    `  source ~/.bashrc 2>/dev/null`,
    `  source ~/.profile 2>/dev/null`,
    `  source ~/.nvm/nvm.sh 2>/dev/null`,
    `  echo "${MARKER_OK}"`,
    `} || echo "${MARKER_FAIL}"`,
  ].join('\n')

  return [
    `cat > /tmp/pocketdev-claude-install.sh << 'POCKETEOF'\n${scriptLines}\nPOCKETEOF`,
    `tmux kill-session -t ${TMUX_SESSION} 2>/dev/null; true`,
    `tmux new-session -d -s ${TMUX_SESSION} -x 220 -y 50 "bash /tmp/pocketdev-claude-install.sh"`,
    `tmux attach-session -t ${TMUX_SESSION}`,
  ].join('\n')
}

function buildStartCommand(): string {
  // Reattach if a prior session is still running; otherwise start fresh
  return [
    `if tmux has-session -t ${TMUX_SESSION} 2>/dev/null; then`,
    `  tmux attach-session -t ${TMUX_SESSION}`,
    `else`,
    buildTmuxInstallCommand(),
    `fi`,
  ].join('\n')
}

export default function InstallStep({ dispatch }: Props) {
  const { colors, isDark } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const [status, setStatus] = useState<ToolInstallStatus>('queued')
  const [showOutput, setShowOutput] = useState(true)
  const scrollRef = useRef<ScrollView>(null)
  const statusRef = useRef<ToolInstallStatus>('queued')
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep ref in sync so callbacks can read latest status
  statusRef.current = status

  const {
    output, hasError, done, showSudoPrompt, connected,
    sendCommand, sendInput, submitSudoPassword, cancelSudoPrompt, reset,
  } = useTerminalCommand({
    onOutput: (chunk) => {
      console.log('[claude-install] output chunk:', JSON.stringify(chunk.slice(0, 120)))
      // Strip ANSI codes before checking for patterns
      const clean = chunk.replace(ANSI_RE, '')

      // Auto-accept Claude's workspace trust dialog (cursor defaults to option 1)
      if (CLAUDE_TRUST_PATTERN.test(clean)) {
        console.log('[claude-install] Trust dialog detected, auto-accepting')
        sendInput('\n')
      }

      const match = clean.match(MARKER_PATTERN)
      if (match) {
        console.log('[claude-install] Marker detected:', match[1])
        setStatus(match[1] === 'OK' ? 'done' : 'failed')
        // Refresh the stored tool path in SQLite so tasks use the correct binary
        if (match[1] === 'OK') void checkViaApi()
      }
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50)
    },
  })

  // Fallback: if terminal exits without marker, check via API
  useEffect(() => {
    if (done && status === 'installing') {
      console.log('[claude-install] Terminal exited without marker, checking via API...')
      checkViaApi()
    }
  }, [done]) // eslint-disable-line react-hooks/exhaustive-deps

  // Timeout fallback: if stuck for too long, check via API
  useEffect(() => {
    if (status === 'installing') {
      fallbackTimerRef.current = setTimeout(() => {
        if (statusRef.current === 'installing') {
          console.log('[claude-install] Timeout reached, checking via API...')
          checkViaApi()
        }
      }, FALLBACK_TIMEOUT_MS)
    }
    return () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current)
    }
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  async function checkViaApi() {
    if (!server) return
    try {
      const result = await fetchClaudeSetupStatus(server.ip, server.port)
      if (result.installed) {
        console.log('[claude-install] API confirms installed, version:', result.version)
        setStatus('done')
      } else {
        console.log('[claude-install] API says not installed')
        setStatus('failed')
      }
    } catch (err) {
      console.warn('[claude-install] API check failed:', err)
      setStatus('failed')
    }
  }

  // Start install when connected
  useEffect(() => {
    if (connected && status === 'queued') {
      console.log('[claude-install] WS connected, starting install...')
      setStatus('installing')
      setTimeout(() => {
        const cmd = buildStartCommand()
        console.log('[claude-install] Sending:', cmd.slice(0, 80))
        sendCommand(cmd)
      }, 300)
    } else if (!connected) {
      console.log('[claude-install] Waiting for WS connection...')
    }
  }, [connected]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleContinue() {
    dispatch({ type: 'STEP_COMPLETE', step: 'install' })
  }

  function handleRetry() {
    reset()
    setStatus('installing')
    if (connected) {
      sendCommand([
        `tmux kill-session -t ${TMUX_SESSION} 2>/dev/null; true`,
        buildTmuxInstallCommand(),
      ].join('\n'))
    } else {
      checkViaApi()
    }
  }

  const isDone = status === 'done'
  const isFailed = status === 'failed' || hasError

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Image
          source={isDark ? Assets.claudeWhite : Assets.claudeBlack}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>
            {isDone ? 'Installation complete' : 'Install Claude CLI'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {isDone
              ? 'Claude Code is ready for this workspace.'
              : 'Preparing Claude for this workspace...'}
          </Text>
        </View>
      </View>

      {/* Progress card */}
      <View style={styles.cardList}>
        <View style={[
          styles.toolCard,
          {
            backgroundColor: colors.surface,
            borderColor: status === 'installing' ? colors.primary
              : status === 'failed' ? colors.error
              : colors.border,
          },
        ]}>
          <View style={styles.toolIconWrap}>
            <Download
              color={status === 'done' ? '#22c55e'
                : status === 'installing' ? colors.primary
                : status === 'failed' ? colors.error
                : colors.textTertiary}
              size={20}
              strokeWidth={2}
            />
          </View>
          <View style={styles.toolInfo}>
            <Text style={[styles.toolName, { color: colors.text }]}>Claude Code</Text>
            <Text style={[styles.toolDescription, {
              color: status === 'done' ? '#22c55e'
                : status === 'failed' ? colors.error
                : status === 'installing' ? colors.primary
                : colors.textTertiary,
            }]}>
              {status === 'queued' && 'Waiting to connect...'}
              {status === 'installing' && 'Downloading and installing...'}
              {status === 'done' && 'Installed'}
              {status === 'failed' && 'Installation failed'}
            </Text>
          </View>
          <View style={styles.toolStatusIcon}>
            {status === 'queued' && <Clock color={colors.textTertiary} size={18} strokeWidth={2} />}
            {status === 'installing' && <ActivityIndicator color={colors.primary} size="small" />}
            {status === 'done' && (
              <View style={[styles.doneCircle, { backgroundColor: '#22c55e' }]}>
                <Check color="#fff" size={12} strokeWidth={3} />
              </View>
            )}
            {status === 'failed' && (
              <View style={[styles.doneCircle, { backgroundColor: colors.error }]}>
                <AlertCircle color="#fff" size={12} strokeWidth={3} />
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Collapsible activity details */}
      <TouchableOpacity
        style={[styles.outputToggle, { borderColor: colors.border }]}
        onPress={() => setShowOutput(!showOutput)}
        activeOpacity={0.7}
      >
        <Text style={[styles.outputToggleText, { color: colors.textTertiary }]}>
          Activity details
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
              {output || 'Waiting for activity...'}
            </Text>
          </ScrollView>
          {output ? <CopyButton value={output} label="Copy output" /> : null}
        </>
      )}

      {/* Actions */}
      {isDone && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={handleContinue}
          activeOpacity={0.7}
        >
          <Check color={colors.primaryText} size={18} strokeWidth={2.5} />
          <Text style={[styles.buttonText, { color: colors.primaryText }]}>Continue</Text>
        </TouchableOpacity>
      )}

      {isFailed && (
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
    ...typeStyles.heading,
  },
  subtitle: {
    ...typeStyles.bodySmall,
  },
  cardList: {
    gap: spacing[2],
  },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[4],
    borderWidth: 1,
    borderRadius: borderRadius.lg,
  },
  toolIconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolInfo: {
    flex: 1,
    gap: 2,
  },
  toolName: {
    ...typeStyles.button,
  },
  toolDescription: {
    ...typeStyles.bodySmall,
  },
  toolStatusIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
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
    ...typeStyles.bodySmall,
  },
  outputBox: {
    flex: 1,
    borderRadius: borderRadius.md,
    padding: spacing[3],
  },
  outputText: {
    ...typeStyles.mono,
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
    ...typeStyles.button,
  },
})
