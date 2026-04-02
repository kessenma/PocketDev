import React, { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, Image, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useConnectionStore } from '../../../stores/connection'
import { buildTerminalWsUrl } from '../../../services/api'
import { buildPocketDevAuthorizationHeader } from '../../../services/auth'
import { createReactNativeWebSocket } from '../../../services/websocket'
import { getSudoPassword, saveSudoPassword } from '../../../services/secure-storage'
import SudoPrompt from '../SudoPrompt'
import { Assets } from '../../../../assets'
import { Check, Clock, RefreshCw, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react-native'
import type { PkgManagerStatus } from '@pocketdev/shared/types'
import { buildInstallPlan } from './ReviewStep'

const SUDO_PROMPT_PATTERN = /\[sudo\] password for/
const ERROR_PATTERNS = [/^E: /m, /^error:/im, /^fatal:/im, /permission denied/im, /curl.*error/im]

type ToolInstallStatus = 'queued' | 'installing' | 'done' | 'failed'

interface ToolProgress {
  id: string
  name: string
  command: string
  status: ToolInstallStatus
  logo: any
}

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'install' }
  | { type: 'STEP_FAILED'; step: 'install'; error: string }

interface Props {
  pkgStatus: PkgManagerStatus
  dispatch: (action: WizardAction) => void
}

function buildToolQueue(pkgStatus: PkgManagerStatus, isDark: boolean): ToolProgress[] {
  const plan = buildInstallPlan(pkgStatus)
  const queue: ToolProgress[] = []

  const nvmItem = plan.find((p) => p.id === 'nvm')
  const npmItem = plan.find((p) => p.id === 'npm')
  const pnpmItem = plan.find((p) => p.id === 'pnpm')

  if (nvmItem) {
    queue.push({
      id: 'nvm',
      name: 'nvm',
      command: nvmItem.commands[0],
      status: 'queued',
      logo: isDark ? Assets.nvmWhite : Assets.nvmBlack,
    })
  }

  if (npmItem) {
    // Need to source nvm first, then install node
    const sourceNvm = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"'
    queue.push({
      id: 'npm',
      name: 'Node.js + npm',
      command: `${sourceNvm} && ${npmItem.commands[0]}`,
      status: 'queued',
      logo: isDark ? Assets.npmWhite : Assets.npmBlack,
    })
  }

  if (pnpmItem) {
    queue.push({
      id: 'pnpm',
      name: 'pnpm',
      command: pnpmItem.commands[0],
      status: 'queued',
      logo: isDark ? Assets.pnpmWhite : Assets.pnpmBlack,
    })
  }

  return queue
}

export default function InstallStep({ pkgStatus, dispatch }: Props) {
  const { colors, isDark } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const [toolQueue, setToolQueue] = useState<ToolProgress[]>(() => buildToolQueue(pkgStatus, isDark))
  const [currentIndex, setCurrentIndex] = useState(0)
  const [output, setOutput] = useState('')
  const [showOutput, setShowOutput] = useState(false)
  const [showSudoPrompt, setShowSudoPrompt] = useState(false)
  const [allDone, setAllDone] = useState(false)
  const [hasError, setHasError] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const currentIndexRef = useRef(0)
  const toolQueueRef = useRef(toolQueue)

  // Keep refs in sync
  useEffect(() => { toolQueueRef.current = toolQueue }, [toolQueue])
  useEffect(() => { currentIndexRef.current = currentIndex }, [currentIndex])

  const installTool = useCallback(async (index: number) => {
    if (!server) return
    const queue = toolQueueRef.current
    if (index >= queue.length) {
      setAllDone(true)
      return
    }

    const tool = queue[index]

    // Mark current tool as installing
    setToolQueue((prev) => prev.map((t, i) => i === index ? { ...t, status: 'installing' as const } : t))
    setOutput('')
    setHasError(false)

    const url = buildTerminalWsUrl(server.ip, server.port)
    const authHeader = await buildPocketDevAuthorizationHeader()
    const termWs = createReactNativeWebSocket(url, { Authorization: authHeader })

    wsRef.current = termWs
    let sawError = false

    termWs.onopen = () => {
      termWs.send(JSON.stringify({ type: 'terminal.input', data: tool.command + '\n' }))
      // Send exit after the command so the terminal closes when done
      // Using a slight delay and wrapping to ensure it runs after the command completes
      setTimeout(() => {
        termWs.send(JSON.stringify({ type: 'terminal.input', data: 'exit\n' }))
      }, 500)
    }

    termWs.onmessage = (event) => {
      let text: string
      try {
        const msg = JSON.parse(event.data as string)
        if (msg.type === 'terminal.output') text = msg.data
        else if (msg.type === 'terminal.exited') text = `\n[exited: ${msg.exitCode}]\n`
        else return
      } catch { text = event.data as string }

      setOutput((prev) => {
        if (SUDO_PROMPT_PATTERN.test(text)) handleSudoNeeded()
        for (const p of ERROR_PATTERNS) {
          if (p.test(text)) { sawError = true; setHasError(true); break }
        }
        return prev + text
      })
    }

    termWs.onclose = () => {
      wsRef.current = null
      const idx = currentIndexRef.current

      if (sawError) {
        setToolQueue((prev) => prev.map((t, i) => i === idx ? { ...t, status: 'failed' as const } : t))
        setHasError(true)
      } else {
        setToolQueue((prev) => prev.map((t, i) => i === idx ? { ...t, status: 'done' as const } : t))
        // Move to next tool
        const nextIndex = idx + 1
        setCurrentIndex(nextIndex)
        // Small delay so user can see the checkmark appear
        setTimeout(() => installTool(nextIndex), 600)
      }
    }
  }, [server])

  // Start installation on mount
  useEffect(() => {
    installTool(0)
    return () => {
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [])

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
    wsRef.current?.send(JSON.stringify({ type: 'terminal.input', data: password + '\n' }))
    if (remember && server) saveSudoPassword(server.ip, password)
  }

  function handleContinue() {
    dispatch({ type: 'STEP_COMPLETE', step: 'install' })
  }

  function handleRetry() {
    setHasError(false)
    // Re-run the current (failed) tool
    installTool(currentIndex)
  }

  const completedCount = toolQueue.filter((t) => t.status === 'done').length
  const totalCount = toolQueue.length

  return (
    <View style={styles.container}>
      {/* Progress header */}
      <View style={styles.progressHeader}>
        <Text style={[styles.title, { color: colors.text }]}>
          {allDone ? 'Installation complete' : `Installing (${completedCount}/${totalCount})`}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {allDone
            ? 'All package managers have been installed.'
            : `Setting up your development tools...`}
        </Text>
      </View>

      {/* Tool progress cards */}
      <ScrollView style={styles.cardList} contentContainerStyle={styles.cardListContent} showsVerticalScrollIndicator={false}>
        {toolQueue.map((tool) => (
          <View key={tool.id} style={[styles.toolCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Image source={tool.logo} style={styles.toolLogo} resizeMode="contain" />
            <View style={styles.toolInfo}>
              <Text style={[styles.toolName, { color: colors.text }]}>{tool.name}</Text>
              <Text style={[styles.toolStatus, {
                color: tool.status === 'done' ? '#22c55e'
                  : tool.status === 'failed' ? colors.error
                  : tool.status === 'installing' ? colors.primary
                  : colors.textTertiary,
              }]}>
                {tool.status === 'queued' && 'Waiting...'}
                {tool.status === 'installing' && 'Installing...'}
                {tool.status === 'done' && 'Installed'}
                {tool.status === 'failed' && 'Failed'}
              </Text>
            </View>
            <View style={styles.toolStatusIcon}>
              {tool.status === 'queued' && <Clock color={colors.textTertiary} size={18} strokeWidth={2} />}
              {tool.status === 'installing' && <ActivityIndicator color={colors.primary} size="small" />}
              {tool.status === 'done' && (
                <View style={[styles.doneCircle, { backgroundColor: '#22c55e' }]}>
                  <Check color="#fff" size={12} strokeWidth={3} />
                </View>
              )}
              {tool.status === 'failed' && (
                <View style={[styles.doneCircle, { backgroundColor: colors.error }]}>
                  <AlertCircle color="#fff" size={12} strokeWidth={3} />
                </View>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

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
        <ScrollView style={[styles.outputBox, { backgroundColor: colors.background }]} nestedScrollEnabled>
          <Text style={[styles.outputText, { color: colors.textSecondary }]} selectable>
            {output || 'Waiting for output...'}
          </Text>
        </ScrollView>
      )}

      {/* Actions */}
      {allDone && !hasError && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={handleContinue}
          activeOpacity={0.7}
        >
          <Check color={colors.primaryText} size={18} strokeWidth={2.5} />
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
        onSubmit={handleSudoSubmit}
        onCancel={() => setShowSudoPrompt(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing[3],
  },
  progressHeader: {
    gap: spacing[1],
  },
  title: {
    ...typographyScale.xl,
    fontWeight: '700',
  },
  subtitle: {
    ...typographyScale.sm,
  },
  cardList: {
    flex: 1,
  },
  cardListContent: {
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
  toolLogo: {
    width: 32,
    height: 32,
  },
  toolInfo: {
    flex: 1,
    gap: 2,
  },
  toolName: {
    ...typographyScale.base,
    fontWeight: '600',
  },
  toolStatus: {
    ...typographyScale.xs,
    fontWeight: '500',
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
