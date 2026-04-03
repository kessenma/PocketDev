import React, { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, Image, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useTerminalCommand } from '../../../hooks/useTerminalCommand'
import SudoPrompt from '../SudoPrompt'
import { Assets } from '../../../../assets'
import { Check, Clock, RefreshCw, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react-native'

// Unique markers echoed after each command to detect completion
const MARKER_OK = (id: string) => `___PY_OK_${id}___`
const MARKER_FAIL = (id: string) => `___PY_FAIL_${id}___`
const MARKER_PATTERN = /___PY_(OK|FAIL)_(\w+)___/

type ToolInstallStatus = 'queued' | 'installing' | 'done' | 'failed'

interface ToolProgress {
  id: string
  name: string
  description: string
  command: string
  status: ToolInstallStatus
}

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'install' }
  | { type: 'STEP_FAILED'; step: 'install'; error: string }

interface Props {
  dispatch: (action: WizardAction) => void
}

function buildToolQueue(): ToolProgress[] {
  return [
    {
      id: 'update',
      name: 'Update packages',
      description: 'Refreshing apt package index',
      command: 'sudo apt-get update -qq',
      status: 'queued',
    },
    {
      id: 'python3',
      name: 'Python 3',
      description: 'Core Python interpreter',
      command: 'sudo apt-get install -y python3',
      status: 'queued',
    },
    {
      id: 'pip',
      name: 'pip',
      description: 'Python package manager',
      command: 'sudo apt-get install -y python3-pip',
      status: 'queued',
    },
    {
      id: 'venv',
      name: 'venv',
      description: 'Virtual environment support',
      command: 'sudo apt-get install -y python3-venv',
      status: 'queued',
    },
  ]
}

/**
 * Wrap a command with echo markers so we can detect success/failure in output.
 */
function wrapWithMarker(id: string, command: string): string {
  return `( ${command} ) && echo "${MARKER_OK(id)}" || echo "${MARKER_FAIL(id)}"`
}

export default function InstallStep({ dispatch }: Props) {
  const { colors, isDark } = useTheme()
  const [toolQueue, setToolQueue] = useState<ToolProgress[]>(buildToolQueue)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showOutput, setShowOutput] = useState(false)
  const [allDone, setAllDone] = useState(false)
  const currentIndexRef = useRef(0)
  const toolQueueRef = useRef(toolQueue)

  // Keep refs in sync
  useEffect(() => { toolQueueRef.current = toolQueue }, [toolQueue])
  useEffect(() => { currentIndexRef.current = currentIndex }, [currentIndex])

  const sendNextRef = useRef<(index: number) => void>(() => {})

  const {
    output, hasError, showSudoPrompt, connected,
    sendCommand, submitSudoPassword, cancelSudoPrompt,
  } = useTerminalCommand({
    persistent: true,
    onOutput: (chunk) => {
      const match = chunk.match(MARKER_PATTERN)
      if (match) {
        const result = match[1]
        const toolId = match[2]
        const idx = currentIndexRef.current

        if (result === 'OK') {
          setToolQueue((prev) => prev.map((t) => t.id === toolId ? { ...t, status: 'done' as const } : t))
          setTimeout(() => sendNextRef.current(idx + 1), 600)
        } else {
          setToolQueue((prev) => prev.map((t) => t.id === toolId ? { ...t, status: 'failed' as const } : t))
        }
      }
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
    setToolQueue((prev) => prev.map((t, i) => i === index ? { ...t, status: 'installing' as const } : t))

    sendCommand(wrapWithMarker(tool.id, tool.command))
  }, [sendCommand])

  // Keep ref in sync so onOutput callback can call it
  useEffect(() => { sendNextRef.current = doSendNext }, [doSendNext])

  // Start first command when connected
  useEffect(() => {
    if (connected && toolQueue[0]?.status === 'queued') {
      doSendNext(0)
    }
  }, [connected]) // eslint-disable-line react-hooks/exhaustive-deps

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
        <View style={styles.headerRow}>
          <Image
            source={isDark ? Assets.pythonWhite : Assets.pythonBlack}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>
              {allDone ? 'Installation complete' : `Installing (${completedCount}/${totalCount})`}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {allDone
                ? 'Python 3 and tools are ready.'
                : 'Setting up Python on your server...'}
            </Text>
          </View>
        </View>
      </View>

      {/* Tool progress cards */}
      <ScrollView style={styles.cardList} contentContainerStyle={styles.cardListContent} showsVerticalScrollIndicator={false}>
        {toolQueue.map((tool) => (
          <View key={tool.id} style={[styles.toolCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.toolInfo}>
              <Text style={[styles.toolName, { color: colors.text }]}>{tool.name}</Text>
              <Text style={[styles.toolDescription, {
                color: tool.status === 'done' ? '#22c55e'
                  : tool.status === 'failed' ? colors.error
                  : tool.status === 'installing' ? colors.primary
                  : colors.textTertiary,
              }]}>
                {tool.status === 'queued' && tool.description}
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
  toolInfo: {
    flex: 1,
    gap: 2,
  },
  toolName: {
    ...typographyScale.base,
    fontWeight: '600',
  },
  toolDescription: {
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
