import React, { useEffect, useRef, useState } from 'react'
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { useTaskStore } from '../../stores/tasks'

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
      <View
        style={[
          styles.emptyState,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.emptyTitle, { color: colors.text }]}>{emptyTitle}</Text>
        <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>{emptyBody}</Text>
      </View>
    )
  }

  const isRunning = task.status === 'running'
  const statusColor = STATUS_COLORS[task.status ?? 'pending']
  const elapsed = task.started_at ? formatElapsed(task.started_at, task.completed_at) : '--'

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.statusBar, { borderBottomColor: colors.border }]}>
        <View style={styles.statusMeta}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{task.status}</Text>
          <Text style={[styles.elapsed, { color: colors.textTertiary }]}>{elapsed}</Text>
        </View>
        {isRunning ? (
          <TouchableOpacity
            style={[styles.killButton, { backgroundColor: colors.error }]}
            onPress={() => killTask(task.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.killButtonText}>Kill</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={[styles.promptCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
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
        <TouchableOpacity
          style={[styles.scrollButton, { backgroundColor: colors.primary }]}
          onPress={handleScrollToBottom}
          activeOpacity={0.7}
        >
          <Text style={[styles.scrollButtonText, { color: colors.primaryText }]}>Scroll to bottom</Text>
        </TouchableOpacity>
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
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  emptyState: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[8],
  },
  emptyTitle: {
    ...typographyScale['2xl'],
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyBody: {
    ...typographyScale.base,
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statusMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    ...typographyScale.sm,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  elapsed: {
    ...typographyScale.sm,
    marginLeft: spacing[2],
  },
  killButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  killButtonText: {
    color: '#ffffff',
    ...typographyScale.sm,
    fontWeight: '600',
  },
  promptCard: {
    margin: spacing[4],
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[1],
  },
  promptLabel: {
    ...typographyScale.xs,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  promptText: {
    ...typographyScale.base,
  },
  logList: {
    flex: 1,
  },
  logContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[6],
  },
  logLine: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 900,
  },
  emptyLogs: {
    ...typographyScale.sm,
    paddingVertical: spacing[4],
  },
  scrollButton: {
    position: 'absolute',
    bottom: spacing[4],
    alignSelf: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
  },
  scrollButtonText: {
    ...typographyScale.xs,
    fontWeight: '600',
  },
})
