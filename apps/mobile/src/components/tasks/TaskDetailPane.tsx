import React, { useEffect, useRef, useState } from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { useTaskStore } from '../../stores/tasks'
import BauhausBadge from '../shared/BauhausBadge'
import BauhausButton from '../shared/BauhausButton'
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
  const task = useTaskStore((s) => (taskId ? s.tasks.get(taskId) : null))
  const logs = useTaskStore((s) => (taskId ? s.taskLogs.get(taskId) ?? [] : []))
  const killTask = useTaskStore((s) => s.killTask)

  const flatListRef = useRef<FlatList>(null)
  const [autoScroll, setAutoScroll] = useState(true)

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
        {isRunning ? (
          <BauhausButton variant="danger" compact onPress={() => killTask(task.id)}>
            Kill
          </BauhausButton>
        ) : null}
      </View>

      <View style={[styles.promptCard, { backgroundColor: colors.panelAlt, borderColor: colors.border }]}>
        <Text style={[styles.promptLabel, { color: colors.textTertiary }]}>Prompt</Text>
        <Text style={[styles.promptText, { color: colors.text }]}>{task.prompt}</Text>
      </View>

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
