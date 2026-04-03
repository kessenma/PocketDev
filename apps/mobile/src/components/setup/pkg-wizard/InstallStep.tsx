import React, { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, Image, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useTerminalCommand } from '../../../hooks/useTerminalCommand'
import SudoPrompt from '../SudoPrompt'
import { Assets } from '../../../../assets'
import { Check, Clock, RefreshCw, AlertCircle } from 'lucide-react-native'
import type { PkgManagerStatus } from '@pocketdev/shared/types'
import { buildInstallPlan } from './ReviewStep'

// Marker pattern: sent as a separate echo after each install command.
// We scan the full accumulated output so split chunks don't matter.
const DONE_PATTERN = /__PKGDONE_(\w+)_(\d+)__/g

type ToolInstallStatus = 'queued' | 'installing' | 'done' | 'failed'

interface ToolProgress {
  id: string
  name: string
  description: string
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
      description: 'Installing Node Version Manager to ~/.nvm',
      command: nvmItem.commands[0],
      status: 'queued',
      logo: isDark ? Assets.nvmWhite : Assets.nvmBlack,
    })
  }

  if (npmItem) {
    // Source nvm so `nvm install` works in the same session
    const sourceNvm = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"'
    queue.push({
      id: 'npm',
      name: 'Node.js + npm',
      description: 'Installing latest LTS Node.js via nvm',
      command: `${sourceNvm} && ${npmItem.commands[0]}`,
      status: 'queued',
      logo: isDark ? Assets.npmWhite : Assets.npmBlack,
    })
  }

  if (pnpmItem) {
    queue.push({
      id: 'pnpm',
      name: 'pnpm',
      description: 'Installing pnpm to ~/.local/share/pnpm',
      command: pnpmItem.commands[0],
      status: 'queued',
      logo: isDark ? Assets.pnpmWhite : Assets.pnpmBlack,
    })
  }

  return queue
}

export default function InstallStep({ pkgStatus, dispatch }: Props) {
  const { colors, isDark } = useTheme()
  const [toolQueue, setToolQueue] = useState<ToolProgress[]>(() => buildToolQueue(pkgStatus, isDark))
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentOutput, setCurrentOutput] = useState('')
  const [allDone, setAllDone] = useState(false)
  const currentIndexRef = useRef(0)
  const toolQueueRef = useRef(toolQueue)
  const processedMarkersRef = useRef<Set<string>>(new Set())
  const scrollRef = useRef<ScrollView>(null)
  const sendNextRef = useRef<(index: number) => void>(() => {})

  useEffect(() => { toolQueueRef.current = toolQueue }, [toolQueue])
  useEffect(() => { currentIndexRef.current = currentIndex }, [currentIndex])

  // Track whether the shell is actually responsive
  const shellReadyRef = useRef(false)

  const {
    hasError, showSudoPrompt,
    sendCommand, submitSudoPassword, cancelSudoPrompt,
  } = useTerminalCommand({
    // Send a simple echo on connect to verify the shell works
    initialCommand: 'echo __SHELL_READY__',
    persistent: true,
    onOutput: (chunk, fullOutput) => {
      // Wait for shell readiness confirmation before doing anything
      if (!shellReadyRef.current) {
        if (fullOutput.includes('__SHELL_READY__')) {
          shellReadyRef.current = true
          // Shell is alive — start the first install
          setTimeout(() => sendNextRef.current(0), 200)
        }
        return
      }

      // Track per-tool output for the expanded card
      setCurrentOutput((prev) => prev + chunk)

      // Scan full output for completion markers
      DONE_PATTERN.lastIndex = 0
      let match: RegExpExecArray | null
      while ((match = DONE_PATTERN.exec(fullOutput)) !== null) {
        const toolId = match[1]
        const exitCode = match[2]
        const markerKey = `${toolId}_${exitCode}`

        if (processedMarkersRef.current.has(markerKey)) continue
        processedMarkersRef.current.add(markerKey)

        const idx = currentIndexRef.current
        if (exitCode === '0') {
          setToolQueue((prev) => prev.map((t) => t.id === toolId ? { ...t, status: 'done' as const } : t))
          setTimeout(() => sendNextRef.current(idx + 1), 600)
        } else {
          setToolQueue((prev) => prev.map((t) => t.id === toolId ? { ...t, status: 'failed' as const } : t))
        }
      }

      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50)
    },
  })

  const doSendNext = useCallback((index: number) => {
    const queue = toolQueueRef.current
    if (index >= queue.length) {
      sendCommand('exit')
      setAllDone(true)
      return
    }

    const tool = queue[index]
    setCurrentIndex(index)
    setCurrentOutput('')
    setToolQueue((prev) => prev.map((t, i) => i === index ? { ...t, status: 'installing' as const } : t))

    // Send install command on its own, then the marker as a separate command.
    // Using sendCommand twice instead of embedding \n ensures both lines
    // are properly delivered as separate inputs to the PTY.
    sendCommand(tool.command)
    setTimeout(() => {
      sendCommand(`echo __PKGDONE_${tool.id}_$?__`)
    }, 100)
  }, [sendCommand])

  // Keep ref in sync so onOutput callback can call it
  useEffect(() => { sendNextRef.current = doSendNext }, [doSendNext])

  function handleContinue() {
    dispatch({ type: 'STEP_COMPLETE', step: 'install' })
  }

  function handleRetry() {
    doSendNext(currentIndex)
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
            : 'Setting up your development tools...'}
        </Text>
      </View>

      {/* Tool progress cards */}
      <ScrollView style={styles.cardList} contentContainerStyle={styles.cardListContent} showsVerticalScrollIndicator={false}>
        {toolQueue.map((tool) => {
          const isActive = tool.status === 'installing'
          const isFailed = tool.status === 'failed'
          const isExpanded = isActive || isFailed

          return (
            <View key={tool.id} style={[
              styles.toolCard,
              { backgroundColor: colors.surface, borderColor: isActive ? colors.primary : isFailed ? colors.error : colors.border },
              isActive && styles.toolCardActive,
            ]}>
              {/* Card header row */}
              <View style={styles.toolHeader}>
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
                    {tool.status === 'installing' && tool.description}
                    {tool.status === 'done' && 'Installed'}
                    {tool.status === 'failed' && 'Failed — see output below'}
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

              {/* Expanded: command + live output */}
              {isExpanded && (
                <View style={styles.expandedSection}>
                  {/* Command being run */}
                  <View style={[styles.commandBlock, { backgroundColor: colors.background }]}>
                    <Text style={[styles.commandPrefix, { color: colors.textTertiary }]}>$</Text>
                    <Text style={[styles.commandText, { color: colors.text }]} numberOfLines={2}>
                      {tool.command}
                    </Text>
                  </View>

                  {/* Live output */}
                  <ScrollView
                    ref={isActive ? scrollRef : undefined}
                    style={[styles.outputBox, { backgroundColor: colors.background }]}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator
                  >
                    <Text style={[styles.outputText, { color: colors.textSecondary }]} selectable>
                      {currentOutput || 'Waiting for output...'}
                    </Text>
                  </ScrollView>
                </View>
              )}
            </View>
          )
        })}
      </ScrollView>

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
    paddingBottom: spacing[2],
  },
  toolCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[3],
  },
  toolCardActive: {
    borderWidth: 1.5,
  },
  toolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
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
  expandedSection: {
    gap: spacing[2],
  },
  commandBlock: {
    flexDirection: 'row',
    gap: spacing[2],
    borderRadius: borderRadius.md,
    padding: spacing[2],
    paddingHorizontal: spacing[3],
  },
  commandPrefix: {
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 16,
  },
  commandText: {
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  outputBox: {
    maxHeight: 180,
    borderRadius: borderRadius.md,
    padding: spacing[3],
  },
  outputText: {
    fontFamily: 'monospace',
    fontSize: 11,
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
