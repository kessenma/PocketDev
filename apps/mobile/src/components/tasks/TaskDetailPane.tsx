import React, { useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { Code, Info, ShieldAlert } from 'lucide-react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { useTaskStore } from '../../stores/tasks'
import BauhausBadge from '../shared/BauhausBadge'
import BauhausButton from '../shared/BauhausButton'
import TaskStreamer from './TaskStreamer'
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

  const flatListRef = useRef<FlatList>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [showRawLogs, setShowRawLogs] = useState(false)

  useEffect(() => {
    if (autoScroll && logs.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: false })
    }
  }, [logs.length, autoScroll])

  function handleScroll(event: any) {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent
    const isNearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 50
    setAutoScroll(isNearBottom)
  }

  function handleScrollToBottom() {
    flatListRef.current?.scrollToEnd({ animated: true })
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
  const statusColor = STATUS_COLORS[task.status ?? 'pending']
  const elapsed = task.started_at ? formatElapsed(task.started_at, task.completed_at) : '--'

  return (
    <View style={[styles.container, { backgroundColor: colors.panel, borderColor: colors.border }]}>
      <View style={[styles.statusBar, { borderBottomColor: colors.border }]}>
        <View style={styles.statusMeta}>
          <BauhausBadge label={task.status} color={statusColor} />
          <Text style={[styles.elapsed, { color: colors.textTertiary }]}>{elapsed}</Text>
        </View>
        <View style={styles.statusActions}>
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

      <View style={[styles.promptCard, { backgroundColor: colors.panelAlt, borderColor: colors.border }]}>
        <Text style={[styles.promptLabel, { color: colors.textTertiary }]}>Prompt</Text>
        <Text style={[styles.promptText, { color: colors.text }]}>{task.prompt}</Text>
      </View>

      {pendingPermissions.length > 0 && (
        <View style={[styles.permissionCard, { backgroundColor: colors.panelAlt, borderColor: '#f59e0b' }]}>
          <View style={styles.permissionHeader}>
            <ShieldAlert color="#f59e0b" size={18} strokeWidth={2.25} />
            <Text style={[styles.permissionTitle, { color: colors.text }]}>Permissions Required</Text>
          </View>
          <Text style={[styles.permissionBody, { color: colors.textSecondary }]}>
            Claude requested {pendingPermissions.length} tool{pendingPermissions.length > 1 ? 's' : ''} that need approval. The task exited — re-run with auto-approve to allow these tools.
          </Text>
          <ScrollView style={styles.permissionList} nestedScrollEnabled>
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
          </ScrollView>
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

      {showRawLogs ? (
        <>
          <FlatList
            ref={flatListRef}
            data={logs}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item }) => <Text style={[styles.logLine, { color: colors.text }]}>{item}</Text>}
            style={styles.logList}
            contentContainerStyle={styles.logContent}
            onScroll={handleScroll}
            scrollEventThrottle={100}
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
        </>
      ) : (
        <TaskStreamer taskId={task.id} />
      )}

      {taskId ? <TaskInteractionSheet taskId={taskId} /> : null}
    </View>
  )
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
  promptCard: {
    margin: spacing[4],
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[1],
  },
  promptLabel: {
    ...typeStyles.sectionTitle,
  },
  promptText: {
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
})
