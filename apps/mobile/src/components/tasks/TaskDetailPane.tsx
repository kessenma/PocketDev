import React, { useEffect, useMemo, useRef, useState } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Clipboard from '@react-native-clipboard/clipboard'
import { FlashList, type FlashListRef } from '@shopify/flash-list'
import { EnrichedMarkdownText } from 'react-native-enriched-markdown'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import type { TaskActivity } from '@pocketdev/shared/types'
import { Bug, Check, Copy, FileText, GalleryVerticalEnd, Info, Layers, MessageSquare, ShieldAlert, SquareTerminal, Terminal } from 'lucide-react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { useSetupStore } from '../../stores/setup'
import { useTaskStore } from '../../stores/tasks'
import { useToast } from '../../hooks/useToast'
import BauhausBadge from '../shared/BauhausBadge'
import BauhausButton from '../shared/BauhausButton'
import BauhausChatInput from '../shared/BauhausChatInput'
import CodexWizardSheet from '../setup/CodexWizardSheet'
import { type StreamItem } from './TaskStreamer'
import { GroupedItemRow } from './ActivityCards'
import TaskDebugSheet from './TaskDebugSheet'
import TaskConversation from './TaskConversation'
import TaskInteractionSheet from './TaskInteractionSheet'
import { getToolUseDetail, groupActivitiesIntoCards, parseCodexRawLogToActivity } from './task-stream-utils'
import type { GroupedStreamItem } from './task-stream-utils'
import { inferTaskDebugSelection, type TaskDebugSelection } from './task-debug-utils'
import { typeStyles } from '../../theme/typography'

type Props = {
  taskId: string | null
  emptyTitle?: string
  emptyBody?: string
  hideHeader?: boolean
  /** When true the entire status bar row is hidden (parent renders its own controls) */
  hideStatusBar?: boolean
  /** Controlled raw-logs state — if provided, overrides internal toggle */
  rawLogsActive?: boolean
  onRawLogsToggle?: () => void
  /** Incrementing counter — parent increments to imperatively open the copy menu */
  copyTrigger?: number
  /** Called after a copy completes so parent can show its own feedback */
  onCopied?: () => void
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#a3a3a3',
  running: '#3b82f6',
  completed: '#22c55e',
  failed: '#ef4444',
  killed: '#737373',
}

function DetailHeader({
  task,
  isRunning,
  isMultiTurn,
  turns,
  resultText,
  pendingPermissions,
  colors,
  taskId,
  clearPermissions,
  startTask,
  hidePromptPreview,
}: {
  task: any
  isRunning: boolean
  isMultiTurn: boolean
  turns: any[]
  resultText: string | null
  pendingPermissions: any[]
  colors: any
  taskId: string | null
  clearPermissions: (id: string) => void
  startTask: (...args: any[]) => void
  hidePromptPreview?: boolean
}) {
  return (
    <>
      {/* For multi-turn tasks, show conversation thread instead of single prompt card */}
      {!hidePromptPreview && (isMultiTurn && turns.length > 0 ? (
        <TaskConversation turns={turns} />
      ) : (
        <View style={[styles.promptCard, { backgroundColor: colors.panelAlt, borderColor: colors.border }]}>
          <Text style={[styles.promptLabel, { color: colors.textTertiary }]}>Prompt</Text>
          <Text style={[styles.promptText, { color: colors.text }]} numberOfLines={3}>
            {extractUserRequest(task.prompt)}
          </Text>
        </View>
      ))}

      {/* Only show result card for single-turn completed tasks (multi-turn has results in conversation) */}
      {!isRunning && !isMultiTurn && resultText ? (
        <View style={[styles.resultCard, { backgroundColor: colors.panelAlt, borderColor: colors.primary }]}>
          <View style={styles.resultHeader}>
            <MessageSquare color={colors.primary} size={14} strokeWidth={2.25} />
            <Text style={[styles.resultLabel, { color: colors.primary }]}>Result</Text>
          </View>
          <EnrichedMarkdownText
            markdown={resultText}
            markdownStyle={{
              paragraph: { color: colors.text, fontSize: 14, lineHeight: 20 },
              strong: { color: colors.text },
              link: { color: colors.primary },
              code: { color: colors.primary, backgroundColor: colors.panelAlt },
            }}
          />
        </View>
      ) : null}

      {pendingPermissions.length > 0 && (
        <View style={[styles.permissionCard, { backgroundColor: colors.panelAlt, borderColor: '#f59e0b' }]}>
          <View style={styles.permissionHeader}>
            <ShieldAlert color="#f59e0b" size={18} strokeWidth={2.25} />
            <Text style={[styles.permissionTitle, { color: colors.text }]}>Permissions Required</Text>
          </View>
          <Text style={[styles.permissionBody, { color: colors.textSecondary }]}>
            The agent requested {pendingPermissions.length} tool{pendingPermissions.length > 1 ? 's' : ''} that still need approval. The task exited, so you can re-run it with broader approvals or dismiss the request.
          </Text>
          {pendingPermissions.map((denial: any, i: number) => (
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
    </>
  )
}

export default function TaskDetailPane({
  taskId,
  emptyTitle = 'Select a task',
  emptyBody = 'Choose a task to inspect logs, timing, and status without leaving the list.',
  hideHeader = false,
  hideStatusBar = false,
  rawLogsActive,
  onRawLogsToggle,
  copyTrigger,
  onCopied,
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
  const setupReport = useSetupStore((s) => s.report)
  const { toast } = useToast()

  const flashListRef = useRef<FlashListRef<GroupedStreamItem>>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [showRawLogsInternal, setShowRawLogsInternal] = useState(false)
  const showRawLogs = rawLogsActive ?? showRawLogsInternal
  const toggleRawLogs = onRawLogsToggle ?? (() => setShowRawLogsInternal((v) => !v))
  const [showCopyMenu, setShowCopyMenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showDebugSheet, setShowDebugSheet] = useState(false)
  const [showCodexWizard, setShowCodexWizard] = useState(false)
  const [debugSelection, setDebugSelection] = useState<TaskDebugSelection>(null)
  const [codexWizardKey, setCodexWizardKey] = useState(0)

  // Parent can open the copy menu by incrementing copyTrigger
  useEffect(() => {
    if (copyTrigger) setShowCopyMenu(true)
  }, [copyTrigger])

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
    onCopied?.()
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

  const rawStreamItems: StreamItem[] = useMemo(() => {
    if (showRawLogs) return logs.map((l) => ({ kind: 'log' as const, data: l }))
    if (activities.length > 0) return activities.map((a) => ({ kind: 'activity' as const, data: a }))
    if (task?.agent_type === 'codex') {
      const fallbackActivities = logs
        .map(parseCodexRawLogToActivity)
        .filter((activity): activity is TaskActivity => activity != null)
      if (fallbackActivities.length > 0) {
        return fallbackActivities.map((activity) => ({ kind: 'activity' as const, data: activity }))
      }
    }
    return logs.map((l) => ({ kind: 'log' as const, data: l }))
  }, [showRawLogs, activities, logs, task?.agent_type])

  const streamItems: GroupedStreamItem[] = useMemo(
    () => groupActivitiesIntoCards(rawStreamItems),
    [rawStreamItems],
  )

  const itemCount = streamItems.length
  useEffect(() => {
    if (autoScroll && itemCount > 0) {
      flashListRef.current?.scrollToEnd({ animated: false })
    }
  }, [itemCount, autoScroll])

  function handleScroll(event: any) {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent
    const isNearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 50
    setAutoScroll(isNearBottom)
  }

  function handleScrollToBottom() {
    flashListRef.current?.scrollToEnd({ animated: true })
    setAutoScroll(true)
  }

  const inferredDebugSelection = useMemo(
    () => inferTaskDebugSelection({
      task: task ?? null,
      logs,
      activities,
      pendingPermissions,
      report: setupReport,
    }),
    [task, logs, activities, pendingPermissions, setupReport],
  )

  useEffect(() => {
    if (!showDebugSheet) return
    setDebugSelection(inferredDebugSelection)
  }, [showDebugSheet, inferredDebugSelection])

  function handleOpenDebugSheet() {
    setDebugSelection(inferredDebugSelection)
    setShowDebugSheet(true)
  }

  function handleDebugContinue() {
    if (debugSelection === 'auth') {
      setShowDebugSheet(false)
      setCodexWizardKey((value) => value + 1)
      setShowCodexWizard(true)
      return
    }
    setShowDebugSheet(false)
  }

  if (!task) {
    return (
      <>
        <View style={[styles.emptyState, { backgroundColor: colors.panel, borderColor: colors.border }]}>
          <View style={styles.emptyStateBugRow}>
            <TouchableOpacity
              onPress={handleOpenDebugSheet}
              activeOpacity={0.7}
              style={[styles.logToggle, { borderColor: colors.border }]}
            >
              <Bug color={colors.textTertiary} size={14} strokeWidth={2.25} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{emptyTitle}</Text>
          <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>{emptyBody}</Text>
        </View>
        <TaskDebugSheet
          visible={showDebugSheet}
          selection={debugSelection}
          onClose={() => setShowDebugSheet(false)}
          onSelect={setDebugSelection}
          onContinue={handleDebugContinue}
        />
      </>
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
      {hideStatusBar ? (
        <View pointerEvents="box-none" style={styles.overlayActions}>
          <TouchableOpacity
            onPress={handleOpenDebugSheet}
            activeOpacity={0.7}
            style={[styles.logToggle, { backgroundColor: colors.panel, borderColor: colors.border }]}
          >
            <Bug color={colors.textTertiary} size={14} strokeWidth={2.25} />
          </TouchableOpacity>
        </View>
      ) : null}
      {!hideStatusBar && (
        <View style={[styles.statusBar, { borderBottomColor: colors.border }]}>
          <View style={styles.statusMeta}>
            {!hideHeader && <BauhausBadge label={task.status} color={statusColor} />}
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
              onPress={handleOpenDebugSheet}
              activeOpacity={0.7}
              style={[styles.logToggle, { borderColor: colors.border }]}
            >
              <Bug color={colors.textTertiary} size={14} strokeWidth={2.25} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={toggleRawLogs}
              activeOpacity={0.7}
              style={[styles.logToggle, { backgroundColor: showRawLogs ? colors.primary + '18' : 'transparent', borderColor: colors.border }]}
            >
              {showRawLogs
                ? <SquareTerminal color={colors.primary} size={14} strokeWidth={2.25} />
                : <GalleryVerticalEnd color={colors.textTertiary} size={14} strokeWidth={2.25} />
              }
            </TouchableOpacity>
            {isRunning ? (
              <BauhausButton variant="danger" compact onPress={() => killTask(task.id)}>
                Kill
              </BauhausButton>
            ) : null}
          </View>
        </View>
      )}

      <FlashList
        ref={flashListRef}
        data={streamItems}
        keyExtractor={(_, i) => String(i)}
        getItemType={(item) => item.kind}
        renderItem={({ item }) => <GroupedItemRow item={item} />}
        contentContainerStyle={styles.scrollAreaContent}
        ItemSeparatorComponent={() => <View style={styles.streamSeparator} />}
        onScroll={handleScroll}
        scrollEventThrottle={100}
        ListHeaderComponent={
          <DetailHeader
            task={task}
            isRunning={isRunning}
            isMultiTurn={isMultiTurn}
            turns={turns}
            resultText={resultText}
            pendingPermissions={pendingPermissions}
            colors={colors}
            taskId={taskId}
            clearPermissions={clearPermissions}
            startTask={startTask}
            hidePromptPreview={hideHeader}
          />
        }
        ListEmptyComponent={
          <Text style={[styles.emptyLogs, { color: colors.textSecondary }]}>
            Task output will appear here.
          </Text>
        }
      />

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
      <TaskDebugSheet
        visible={showDebugSheet}
        selection={debugSelection}
        onClose={() => setShowDebugSheet(false)}
        onSelect={setDebugSelection}
        onContinue={handleDebugContinue}
      />
      {showCodexWizard ? (
        <CodexWizardSheet
          key={`codex-auth-repair-${codexWizardKey}`}
          visible={showCodexWizard}
          entryMode="auth_repair"
          onClose={() => setShowCodexWizard(false)}
          onComplete={() => setShowCodexWizard(false)}
        />
      ) : null}

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
      const detail = getToolUseDetail(activity)
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
  emptyStateBugRow: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: spacing[4],
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
  scrollAreaContent: {
    paddingBottom: spacing[6],
  },
  streamSeparator: {
    height: spacing[1],
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
  emptyLogs: {
    ...typeStyles.bodySmall,
    paddingVertical: spacing[4],
  },
  scrollButton: {
    position: 'absolute',
    bottom: spacing[4],
    alignSelf: 'center',
  },
  overlayActions: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    zIndex: 10,
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
