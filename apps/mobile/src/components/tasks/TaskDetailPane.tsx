import React, { useEffect, useMemo, useRef, useState } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Clipboard from '@react-native-clipboard/clipboard'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import type { TaskActivity } from '@pocketdev/shared/types'
import { Check, Code, Copy, FileText, Info, Layers, MessageSquare, ShieldAlert, Terminal } from 'lucide-react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { useTaskStore } from '../../stores/tasks'
import { useToast } from '../../hooks/useToast'
import BauhausBadge from '../shared/BauhausBadge'
import BauhausButton from '../shared/BauhausButton'
import BauhausChatInput from '../shared/BauhausChatInput'
import { TaskStreamerInline } from './TaskStreamer'
import TaskConversation from './TaskConversation'
import TaskInteractionSheet from './TaskInteractionSheet'
import { typeStyles } from '../../theme/typography'

type Props = {
  taskId: string | null
  emptyTitle?: string
  emptyBody?: string
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#a3a3a3',
  running: '#3b82f6',
  completed: '#22c55e',
  failed: '#ef4444',
  killed: '#737373',
}

export default function TaskDetailPane({
  taskId,
  emptyTitle = 'Select a task',
  emptyBody = 'Choose a task to inspect logs, timing, and status without leaving the list.',
}: Props) {
  const { colors } = useTheme()
  const task = useTaskStore((s) => (taskId ? s.tasks.get(taskId) : undefined))
  const logsRaw = useTaskStore((s) => (taskId ? s.taskLogs.get(taskId) : undefined))
  const logs = useMemo(() => logsRaw ?? [], [logsRaw])
  const killTask = useTaskStore((s) => s.killTask)
  const permissionsRaw = useTaskStore((s) => (taskId ? s.pendingPermissions.get(taskId) : undefined))
  const pendingPermissions = useMemo(() => permissionsRaw ?? [], [permissionsRaw])
  const clearPermissions = useTaskStore((s) => s.clearPermissions)
  const startTask = useTaskStore((s) => s.startTask)

  const activitiesRaw = useTaskStore((s) => (taskId ? s.taskActivities.get(taskId) : undefined))
  const activities = useMemo(() => activitiesRaw ?? [], [activitiesRaw])
  const turnsRaw = useTaskStore((s) => (taskId ? s.taskTurns.get(taskId) : undefined))
  const turns = useMemo(() => turnsRaw ?? [], [turnsRaw])
  const continueTask = useTaskStore((s) => s.continueTask)
  const loadTurnsForTask = useTaskStore((s) => s.loadTurnsForTask)
  const { toast } = useToast()

  const scrollViewRef = useRef<ScrollView>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [showRawLogs, setShowRawLogs] = useState(false)
  const [showCopyMenu, setShowCopyMenu] = useState(false)
  const [copied, setCopied] = useState(false)

  function buildHeader(): string {
    const provider = task?.agent_type ?? 'unknown'
    const model = task?.model ?? 'default'
    return `Provider: ${provider}\nModel: ${model}`
  }

  function buildPromptText(): string {
    return task ? extractUserRequest(task.prompt) : ''
  }

  function buildOutputText(): string {
    if (activities.length > 0) return activities.map(activityToText).filter(Boolean).join('\n')
    return logs.join('\n')
  }

  function handleCopyOption(option: 'prompt' | 'output' | 'both') {
    const header = buildHeader()
    let body = ''
    let label = ''

    switch (option) {
      case 'prompt':
        body = `${header}\n\nPrompt:\n${buildPromptText()}`
        label = 'Prompt'
        break
      case 'output':
        body = `${header}\n\nOutput:\n${buildOutputText()}`
        label = 'Output'
        break
      case 'both':
        body = `${header}\n\nPrompt:\n${buildPromptText()}\n\nOutput:\n${buildOutputText()}`
        label = 'Prompt + Output'
        break
    }

    if (!body.trim()) return
    Clipboard.setString(body)
    setShowCopyMenu(false)
    setCopied(true)
    toast({ title: 'Copied!', description: `${label} copied to clipboard.`, variant: 'success' })
    setTimeout(() => setCopied(false), 2000)
  }

  const loadLogsForTask = useTaskStore((s) => s.loadLogsForTask)

  // Auto-fetch logs for completed tasks that have no logs in memory
  useEffect(() => {
    if (!task || !taskId) return
    const isTerminal = task.status === 'completed' || task.status === 'failed' || task.status === 'killed'
    if (isTerminal && logs.length === 0) {
      void loadLogsForTask(taskId)
    }
  }, [task?.status, taskId, logs.length, loadLogsForTask])

  // Auto-fetch turns for multi-turn tasks
  useEffect(() => {
    if (!task || !taskId) return
    if ((task.turn_count ?? 1) > 1 && turns.length === 0) {
      void loadTurnsForTask(taskId)
    }
  }, [task?.turn_count, taskId, turns.length, loadTurnsForTask])

  const itemCount = activities.length + logs.length
  useEffect(() => {
    if (autoScroll && itemCount > 0) {
      scrollViewRef.current?.scrollToEnd({ animated: false })
    }
  }, [itemCount, autoScroll])

  function handleScroll(event: any) {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent
    const isNearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 50
    setAutoScroll(isNearBottom)
  }

  function handleScrollToBottom() {
    scrollViewRef.current?.scrollToEnd({ animated: true })
    setAutoScroll(true)
  }

  if (!task) {
    return (
      <View style={[styles.emptyState, { backgroundColor: colors.panel, borderColor: colors.border }]}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>{emptyTitle}</Text>
        <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>{emptyBody}</Text>
      </View>
    )
  }

  const isRunning = task.status === 'running'
  const isTerminal = task.status === 'completed' || task.status === 'failed'
  const canContinue = isTerminal && task.agent_type === 'claude' && !!task.session_id
  const isMultiTurn = (task.turn_count ?? 1) > 1
  const statusColor = STATUS_COLORS[task.status ?? 'pending']
  const elapsed = task.started_at ? formatElapsed(task.started_at, task.completed_at) : '--'

  // Extract the AI's final text response for the result card
  const resultText = useMemo(() => {
    // From structured activities — grab all text blocks
    if (activities.length > 0) {
      const textParts = activities
        .filter((a): a is Extract<typeof a, { type: 'text' }> => a.type === 'text')
        .map((a) => a.content)
      if (textParts.length > 0) return textParts.join('\n\n')
    }
    // Fallback: parse from raw logs — lines that aren't prefixed with [system], [tool], [thinking], [error], [result], [done], [agent]
    if (logs.length > 0) {
      const textLines = logs.filter(
        (l) => l.length > 0 && !/^\[(system|tool|thinking|error|result|done|agent)\]/.test(l) && !/^Warning:/.test(l),
      )
      if (textLines.length > 0) return textLines.join('\n')
    }
    return null
  }, [activities, logs])

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.panel, borderColor: colors.border }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={[styles.statusBar, { borderBottomColor: colors.border }]}>
        <View style={styles.statusMeta}>
          <BauhausBadge label={task.status} color={statusColor} />
          <Text style={[styles.elapsed, { color: colors.textTertiary }]}>{elapsed}</Text>
        </View>
        <View style={styles.statusActions}>
          <TouchableOpacity
            onPress={() => setShowCopyMenu(true)}
            activeOpacity={0.7}
            style={[styles.logToggle, { backgroundColor: copied ? '#22c55e18' : 'transparent', borderColor: copied ? '#22c55e' : colors.border }]}
          >
            {copied
              ? <Check color="#22c55e" size={14} strokeWidth={2.25} />
              : <Copy color={colors.textTertiary} size={14} strokeWidth={2.25} />}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowRawLogs((v) => !v)}
            activeOpacity={0.7}
            style={[styles.logToggle, { backgroundColor: showRawLogs ? colors.primary + '18' : 'transparent', borderColor: colors.border }]}
          >
            <Code color={showRawLogs ? colors.primary : colors.textTertiary} size={14} strokeWidth={2.25} />
          </TouchableOpacity>
          {isRunning ? (
            <BauhausButton variant="danger" compact onPress={() => killTask(task.id)}>
              Kill
            </BauhausButton>
          ) : null}
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollAreaContent}
        onScroll={handleScroll}
        scrollEventThrottle={100}
      >
        {/* For multi-turn tasks, show conversation thread instead of single prompt card */}
        {isMultiTurn && turns.length > 0 ? (
          <TaskConversation turns={turns} />
        ) : (
          <View style={[styles.promptCard, { backgroundColor: colors.panelAlt, borderColor: colors.border }]}>
            <Text style={[styles.promptLabel, { color: colors.textTertiary }]}>Prompt</Text>
            <Text style={[styles.promptText, { color: colors.text }]} numberOfLines={3}>
              {extractUserRequest(task.prompt)}
            </Text>
          </View>
        )}

        {/* Only show result card for single-turn completed tasks (multi-turn has results in conversation) */}
        {!isRunning && !isMultiTurn && resultText ? (
          <View style={[styles.resultCard, { backgroundColor: colors.panelAlt, borderColor: colors.primary }]}>
            <View style={styles.resultHeader}>
              <MessageSquare color={colors.primary} size={14} strokeWidth={2.25} />
              <Text style={[styles.resultLabel, { color: colors.primary }]}>Result</Text>
            </View>
            <Text style={[styles.resultText, { color: colors.text }]} selectable>
              {resultText}
            </Text>
          </View>
        ) : null}

        {pendingPermissions.length > 0 && (
          <View style={[styles.permissionCard, { backgroundColor: colors.panelAlt, borderColor: '#f59e0b' }]}>
            <View style={styles.permissionHeader}>
              <ShieldAlert color="#f59e0b" size={18} strokeWidth={2.25} />
              <Text style={[styles.permissionTitle, { color: colors.text }]}>Permissions Required</Text>
            </View>
            <Text style={[styles.permissionBody, { color: colors.textSecondary }]}>
              Claude requested {pendingPermissions.length} tool{pendingPermissions.length > 1 ? 's' : ''} that need approval. The task exited — re-run with auto-approve to allow these tools.
            </Text>
            {pendingPermissions.map((denial, i) => (
              <View key={`${denial.tool_use_id ?? i}`} style={[styles.permissionItem, { borderColor: colors.border }]}>
                <Text style={[styles.permissionTool, { color: colors.text }]}>{denial.tool_name}</Text>
                {denial.tool_input?.command ? (
                  <Text style={[styles.permissionInput, { color: colors.textTertiary }]} numberOfLines={3}>
                    {String(denial.tool_input.command)}
                  </Text>
                ) : null}
              </View>
            ))}
            <View style={styles.permissionActions}>
              <BauhausButton
                compact
                onPress={() => {
                  if (!task) return
                  clearPermissions(task.id)
                  startTask(task.prompt, task.agent_type, task.working_directory, task.model, 'default')
                }}
              >
                Re-run with Auto-Approve
              </BauhausButton>
              <BauhausButton compact variant="quiet" onPress={() => { if (taskId) clearPermissions(taskId) }}>
                Dismiss
              </BauhausButton>
            </View>
          </View>
        )}

        {task.agent_type === 'copilot' && (
          <View style={[styles.copilotBanner, { backgroundColor: colors.panelAlt, borderColor: colors.border }]}>
            <Info color={colors.textTertiary} size={16} strokeWidth={2.25} />
            <Text style={[styles.copilotBannerText, { color: colors.textSecondary }]}>
              Copilot runs as a TUI session in tmux. {task.model ? `Selected model: ${task.model}. ` : ''}Task completion is auto-detected when the agent returns to idle.
            </Text>
          </View>
        )}

        {/* Stream / raw log output — rendered inline so everything scrolls together */}
        {showRawLogs ? (
          <View style={styles.logContent}>
            {logs.length === 0 ? (
              <Text style={[styles.emptyLogs, { color: colors.textSecondary }]}>
                Task output will appear here.
              </Text>
            ) : (
              logs.map((line, i) => (
                <Text key={i} style={[styles.logLine, { color: colors.text }]}>{line}</Text>
              ))
            )}
          </View>
        ) : (
          <TaskStreamerInline taskId={task.id} />
        )}
      </ScrollView>

      {!autoScroll ? (
        <View style={styles.scrollButton}>
          <BauhausButton compact onPress={handleScrollToBottom}>
            Scroll To Bottom
          </BauhausButton>
        </View>
      ) : null}

      {/* Chat input for continuing Claude tasks */}
      {canContinue && !isRunning ? (
        <BauhausChatInput
          placeholder="Send a follow-up..."
          onSend={(text) => continueTask(task.id, text)}
        />
      ) : null}

      {taskId ? <TaskInteractionSheet taskId={taskId} /> : null}

      {/* Copy option menu */}
      <Modal visible={showCopyMenu} transparent animationType="fade" onRequestClose={() => setShowCopyMenu(false)}>
        <Pressable style={styles.copyMenuBackdrop} onPress={() => setShowCopyMenu(false)}>
          <View style={[styles.copyMenu, { backgroundColor: colors.panel, borderColor: colors.border }]}>
            <Text style={[styles.copyMenuTitle, { color: colors.textSecondary }]}>Copy</Text>
            {COPY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                activeOpacity={0.7}
                style={[styles.copyMenuItem, { borderBottomColor: colors.border }]}
                onPress={() => handleCopyOption(opt.key)}
              >
                <opt.Icon color={colors.text} size={16} strokeWidth={2.25} />
                <View style={styles.copyMenuItemText}>
                  <Text style={[styles.copyMenuItemLabel, { color: colors.text }]}>{opt.label}</Text>
                  <Text style={[styles.copyMenuItemHint, { color: colors.textTertiary }]}>{opt.hint}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  )
}

/** Extract the user's actual request from the full PocketDev task prompt */
function extractUserRequest(prompt: string): string {
  const marker = 'User request:\n'
  const idx = prompt.indexOf(marker)
  if (idx !== -1) return prompt.slice(idx + marker.length).trim()
  return prompt
}

const COPY_OPTIONS: Array<{
  key: 'prompt' | 'output' | 'both'
  label: string
  hint: string
  Icon: typeof FileText
}> = [
  { key: 'prompt', label: 'Prompt', hint: 'Copy the task prompt', Icon: FileText },
  { key: 'output', label: 'Output', hint: 'Copy the agent output', Icon: Terminal },
  { key: 'both', label: 'Both', hint: 'Copy prompt + output', Icon: Layers },
]

function activityToText(activity: TaskActivity): string {
  switch (activity.type) {
    case 'tool_use': {
      const detail = activity.filePath ?? activity.command ?? activity.pattern ?? activity.description ?? ''
      return `[${activity.tool}] ${detail}`
    }
    case 'tool_result':
      return activity.isError ? `[error] ${activity.preview}` : activity.preview
    case 'thinking':
      return `(thinking) ${activity.preview}`
    case 'text':
      return activity.content
    case 'status':
      return `--- ${activity.message} ---`
    default:
      return ''
  }
}

function formatElapsed(startedAt: string, completedAt: string | null): string {
  const start = new Date(startedAt).getTime()
  const end = completedAt ? new Date(completedAt).getTime() : Date.now()
  const seconds = Math.floor((end - start) / 1000)

  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderWidth: 2,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  emptyState: {
    flex: 1,
    borderWidth: 2,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[8],
  },
  emptyTitle: {
    ...typeStyles.screenTitle,
    textAlign: 'center',
  },
  emptyBody: {
    ...typeStyles.body,
    marginTop: spacing[2],
    maxWidth: 380,
    textAlign: 'center',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 2,
  },
  statusMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  statusActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  logToggle: {
    width: 30,
    height: 30,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  elapsed: {
    ...typeStyles.meta,
    marginLeft: spacing[2],
  },
  scrollArea: {
    flex: 1,
  },
  scrollAreaContent: {
    paddingBottom: spacing[6],
  },
  promptCard: {
    marginHorizontal: spacing[3],
    marginVertical: spacing[2],
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[1],
  },
  promptLabel: {
    ...typeStyles.meta,
    fontWeight: '700',
  },
  promptText: {
    ...typeStyles.body,
  },
  resultCard: {
    marginHorizontal: spacing[3],
    marginBottom: spacing[2],
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[2],
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  resultLabel: {
    ...typeStyles.meta,
    fontWeight: '700',
  },
  resultText: {
    ...typeStyles.body,
  },
  permissionCard: {
    margin: spacing[4],
    marginBottom: 0,
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[3],
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  permissionTitle: {
    ...typeStyles.bodyStrong,
  },
  permissionBody: {
    ...typeStyles.bodySmall,
  },
  permissionList: {
    maxHeight: 160,
  },
  permissionItem: {
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    gap: spacing[1],
  },
  permissionTool: {
    ...typeStyles.meta,
    fontWeight: '700',
  },
  permissionInput: {
    ...typeStyles.mono,
    fontSize: 11,
  },
  permissionActions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  copilotBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginHorizontal: spacing[4],
    marginBottom: spacing[2],
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
  },
  copilotBannerText: {
    ...typeStyles.bodySmall,
    flex: 1,
  },
  logList: {
    flex: 1,
  },
  logContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[6],
  },
  logLine: {
    ...typeStyles.mono,
    maxWidth: 900,
  },
  emptyLogs: {
    ...typeStyles.bodySmall,
    paddingVertical: spacing[4],
  },
  scrollButton: {
    position: 'absolute',
    bottom: spacing[4],
    alignSelf: 'center',
  },

  // ── Copy Menu ──
  copyMenuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  copyMenu: {
    width: 260,
    borderWidth: 2,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    paddingVertical: spacing[2],
  },
  copyMenuTitle: {
    ...typeStyles.meta,
    fontWeight: '700',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  copyMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  copyMenuItemText: {
    flex: 1,
    gap: 2,
  },
  copyMenuItemLabel: {
    ...typeStyles.bodyStrong,
  },
  copyMenuItemHint: {
    ...typeStyles.meta,
  },
})
