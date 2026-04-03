import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, Image, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useConnectionStore } from '../../../stores/connection'
import { postInstallPkgTool } from '../../../services/api'
import { Assets } from '../../../../assets'
import { Check, Clock, RefreshCw, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react-native'
import type { PkgInstallTool, PkgManagerStatus } from '@pocketdev/shared/types'
import { buildInstallPlan, getNextInstallIndex, type ToolInstallStatus } from './model'

interface ToolProgress {
  id: PkgInstallTool
  name: string
  description: string
  status: ToolInstallStatus
  logo: any
  output: string
  error: string | null
  expanded: boolean
}

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'install' }
  | { type: 'STEP_FAILED'; step: 'install'; error: string }

interface Props {
  pkgStatus: PkgManagerStatus
  dispatch: (action: WizardAction) => void
}

function buildToolQueue(pkgStatus: PkgManagerStatus, isDark: boolean): ToolProgress[] {
  return buildInstallPlan(pkgStatus).map((item) => ({
    ...item,
    status: 'queued' as const,
    logo:
      item.id === 'nvm' ? (isDark ? Assets.nvmWhite : Assets.nvmBlack)
        : item.id === 'npm' ? (isDark ? Assets.npmWhite : Assets.npmBlack)
          : item.id === 'pnpm' ? (isDark ? Assets.pnpmWhite : Assets.pnpmBlack)
            : (isDark ? Assets.bunWhite : Assets.bunBlack),
    output: '',
    error: null,
    expanded: false,
  }))
}

export default function InstallStep({ pkgStatus, dispatch }: Props) {
  const { colors, isDark } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const [toolQueue, setToolQueue] = useState<ToolProgress[]>(() => buildToolQueue(pkgStatus, isDark))
  const [currentIndex, setCurrentIndex] = useState(0)
  const [failedIndex, setFailedIndex] = useState<number | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [allDone, setAllDone] = useState(false)

  const queueRef = useRef(toolQueue)
  const runningRef = useRef(false)
  const cancelledRef = useRef(false)

  useEffect(() => {
    queueRef.current = toolQueue
  }, [toolQueue])

  useEffect(() => {
    cancelledRef.current = false
    return () => {
      cancelledRef.current = true
    }
  }, [])

  const updateTool = useCallback((index: number, updates: Partial<ToolProgress>) => {
    setToolQueue((prev) => prev.map((tool, i) => (i === index ? { ...tool, ...updates } : tool)))
  }, [])

  const runInstallSequence = useCallback(async (startIndex: number) => {
    if (!server || runningRef.current) return

    runningRef.current = true
    setIsRunning(true)
    setFailedIndex(null)

    for (let index = startIndex; index < queueRef.current.length; index++) {
      if (cancelledRef.current) break

      const tool = queueRef.current[index]
      setCurrentIndex(index)
      updateTool(index, { status: 'installing', error: null, expanded: false })

      try {
        const result = await postInstallPkgTool(server.ip, server.port, tool.id)
        if (cancelledRef.current) break

        if (!result.success) {
          updateTool(index, {
            status: 'failed',
            error: result.error,
            output: result.output,
            expanded: true,
          })
          setFailedIndex(index)
          dispatch({ type: 'STEP_FAILED', step: 'install', error: result.error ?? `${tool.name} installation failed` })
          runningRef.current = false
          setIsRunning(false)
          return
        }

        updateTool(index, {
          status: 'done',
          error: null,
          output: result.output,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : `${tool.name} installation failed`
        updateTool(index, {
          status: 'failed',
          error: message,
          output: message,
          expanded: true,
        })
        setFailedIndex(index)
        dispatch({ type: 'STEP_FAILED', step: 'install', error: message })
        runningRef.current = false
        setIsRunning(false)
        return
      }
    }

    runningRef.current = false
    setIsRunning(false)
    setAllDone(true)
  }, [dispatch, server, updateTool])

  useEffect(() => {
    if (toolQueue.length > 0 && !allDone && !isRunning && failedIndex === null) {
      runInstallSequence(0)
    }
  }, [allDone, failedIndex, isRunning, runInstallSequence, toolQueue.length])

  const handleRetry = useCallback(() => {
    const retryIndex = getNextInstallIndex(queueRef.current)
    if (retryIndex === null) return
    updateTool(retryIndex, { status: 'queued', error: null })
    runInstallSequence(retryIndex)
  }, [runInstallSequence, updateTool])

  function handleContinue() {
    dispatch({ type: 'STEP_COMPLETE', step: 'install' })
  }

  const completedCount = toolQueue.filter((tool) => tool.status === 'done').length
  const totalCount = toolQueue.length

  return (
    <View style={styles.container}>
      <View style={styles.progressHeader}>
        <Text style={[styles.title, { color: colors.text }]}>
          {allDone ? 'Installation complete' : `Installing (${completedCount}/${totalCount})`}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {allDone
            ? 'All package managers are ready on your server.'
            : 'PocketDev is installing each missing package manager for you.'}
        </Text>
      </View>

      <ScrollView style={styles.cardList} contentContainerStyle={styles.cardListContent} showsVerticalScrollIndicator={false}>
        {toolQueue.map((tool, index) => {
          const isActive = tool.status === 'installing'
          const isFailed = tool.status === 'failed'
          const canExpand = !!tool.output || !!tool.error
          const isExpanded = tool.expanded || isActive || isFailed

          return (
            <View
              key={tool.id}
              style={[
                styles.toolCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: isActive ? colors.primary : isFailed ? colors.error : colors.border,
                },
                isActive && styles.toolCardActive,
              ]}
            >
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
                    {tool.status === 'queued' && (index < currentIndex ? 'Installed' : 'Waiting...')}
                    {tool.status === 'installing' && tool.description}
                    {tool.status === 'done' && 'Installed'}
                    {tool.status === 'failed' && 'Installation failed'}
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

              {canExpand && (
                <TouchableOpacity
                  testID={`pkg-install-toggle-${tool.id}`}
                  style={styles.detailsToggle}
                  onPress={() => updateTool(index, { expanded: !tool.expanded })}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.detailsToggleText, { color: colors.textTertiary }]}>
                    {tool.expanded ? 'Hide details' : 'Show details'}
                  </Text>
                  {tool.expanded
                    ? <ChevronUp color={colors.textTertiary} size={16} strokeWidth={2} />
                    : <ChevronDown color={colors.textTertiary} size={16} strokeWidth={2} />}
                </TouchableOpacity>
              )}

              {isExpanded && (
                <View style={styles.expandedSection}>
                  <View style={[styles.commandBlock, { backgroundColor: colors.background }]}>
                    <Text style={[styles.commandText, { color: colors.text }]}>{tool.description}</Text>
                  </View>

                  <ScrollView
                    style={[styles.outputBox, { backgroundColor: colors.background }]}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator
                  >
                    <Text style={[styles.outputText, { color: isFailed ? colors.error : colors.textSecondary }]} selectable>
                      {tool.output || tool.error || 'Waiting for output...'}
                    </Text>
                  </ScrollView>
                </View>
              )}
            </View>
          )
        })}
      </ScrollView>

      {failedIndex !== null && (
        <TouchableOpacity
          testID="pkg-install-retry"
          style={[styles.actionButton, { backgroundColor: colors.error }]}
          onPress={handleRetry}
          activeOpacity={0.7}
        >
          <RefreshCw color="#fff" size={16} strokeWidth={2.25} />
          <Text style={[styles.actionButtonText, { color: '#fff' }]}>Retry failed install</Text>
        </TouchableOpacity>
      )}

      {allDone && (
        <TouchableOpacity
          testID="pkg-install-continue"
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={handleContinue}
          activeOpacity={0.7}
        >
          <Text style={[styles.actionButtonText, { color: colors.primaryText }]}>Continue</Text>
        </TouchableOpacity>
      )}
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
    gap: spacing[3],
    paddingBottom: spacing[4],
  },
  toolCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[3],
  },
  toolCardActive: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  toolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  toolLogo: {
    width: 28,
    height: 28,
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
  },
  toolStatusIcon: {
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailsToggleText: {
    ...typographyScale.xs,
    fontWeight: '600',
  },
  expandedSection: {
    gap: spacing[2],
  },
  commandBlock: {
    borderRadius: borderRadius.md,
    padding: spacing[3],
  },
  commandText: {
    ...typographyScale.sm,
  },
  outputBox: {
    maxHeight: 180,
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
  actionButtonText: {
    ...typographyScale.base,
    fontWeight: '600',
  },
})
