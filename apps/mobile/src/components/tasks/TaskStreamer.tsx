import React, { useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import {
  Brain,
  FileEdit,
  FilePlus,
  FileSearch,
  MessageSquare,
  Search,
  Terminal,
  Users,
} from 'lucide-react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import type { TaskActivity } from '@pocketdev/shared/types'
import { useTheme } from '../../contexts/ThemeContext'
import { useTaskStore } from '../../stores/tasks'
import BauhausBadge from '../shared/BauhausBadge'
import BauhausButton from '../shared/BauhausButton'
import { typeStyles } from '../../theme/typography'

type StreamItem =
  | { kind: 'activity'; data: TaskActivity }
  | { kind: 'log'; data: string }

type Props = {
  taskId: string
}

export default function TaskStreamer({ taskId }: Props) {
  const { colors } = useTheme()
  const activitiesRaw = useTaskStore((s) => s.taskActivities.get(taskId))
  const logsRaw = useTaskStore((s) => s.taskLogs.get(taskId))

  // Merge activities + fallback logs into a single stream.
  // When activities exist, show them. When they don't (non-stream-json agents), show raw logs.
  const items: StreamItem[] = useMemo(() => {
    const activities = activitiesRaw ?? []
    const logs = logsRaw ?? []

    if (activities.length > 0) {
      return activities.map((a) => ({ kind: 'activity' as const, data: a }))
    }
    // Fallback: render raw logs as stream items
    return logs.map((l) => ({ kind: 'log' as const, data: l }))
  }, [activitiesRaw, logsRaw])

  const flatListRef = useRef<FlatList<StreamItem>>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  useEffect(() => {
    if (autoScroll && items.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: false })
    }
  }, [items.length, autoScroll])

  function handleScroll(event: any) {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent
    const isNearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 50
    setAutoScroll(isNearBottom)
  }

  function handleScrollToBottom() {
    flatListRef.current?.scrollToEnd({ animated: true })
    setAutoScroll(true)
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={items}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) =>
          item.kind === 'activity'
            ? <ActivityRow activity={item.data} />
            : <LogLine line={item.data} />
        }
        style={styles.list}
        contentContainerStyle={styles.listContent}
        onScroll={handleScroll}
        scrollEventThrottle={100}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Activity will appear here as the agent works.
          </Text>
        }
      />

      {!autoScroll && (
        <View style={styles.scrollButton}>
          <BauhausButton compact onPress={handleScrollToBottom}>
            Scroll To Bottom
          </BauhausButton>
        </View>
      )}
    </View>
  )
}

function LogLine({ line }: { line: string }) {
  const { colors } = useTheme()
  return (
    <Text style={[styles.logLine, { color: colors.text }]}>{line}</Text>
  )
}

function ActivityRow({ activity }: { activity: TaskActivity }) {
  const { colors } = useTheme()

  switch (activity.type) {
    case 'tool_use':
      return <ToolUseRow activity={activity} colors={colors} />
    case 'tool_result':
      return <ToolResultRow activity={activity} colors={colors} />
    case 'thinking':
      return <ThinkingRow activity={activity} colors={colors} />
    case 'text':
      return <TextRow activity={activity} colors={colors} />
    case 'status':
      return <StatusRow activity={activity} colors={colors} />
    default:
      return null
  }
}

function ToolUseRow({ activity, colors }: { activity: Extract<TaskActivity, { type: 'tool_use' }>; colors: any }) {
  const tool = activity.tool
  const isWrite = tool === 'Edit' || tool === 'Write'
  const isCreate = tool === 'Write'
  const isRead = tool === 'Read' || tool === 'Glob' || tool === 'Grep'
  const isBash = tool === 'Bash'
  const isAgent = tool === 'Agent'

  let Icon = FileSearch
  let accentColor = colors.textSecondary
  let label = tool
  let detail = ''

  if (isWrite || isCreate) {
    Icon = isCreate ? FilePlus : FileEdit
    accentColor = colors.accentYellow ?? '#f59e0b'
    label = isCreate ? 'Creating' : 'Editing'
    detail = activity.filePath ?? ''
  } else if (isRead) {
    Icon = tool === 'Grep' ? Search : FileSearch
    accentColor = colors.accentBlue ?? '#3b82f6'
    label = tool === 'Grep' ? 'Searching' : tool === 'Glob' ? 'Finding' : 'Reading'
    detail = activity.filePath ?? activity.pattern ?? ''
  } else if (isBash) {
    Icon = Terminal
    accentColor = colors.accentGreen ?? '#22c55e'
    label = 'Running'
    detail = activity.command ?? ''
  } else if (isAgent) {
    Icon = Users
    accentColor = colors.accentPurple ?? '#a855f7'
    label = 'Sub-agent'
    detail = activity.description ?? ''
  }

  return (
    <View style={[styles.row, { borderLeftColor: accentColor }]}>
      <Icon color={accentColor} size={14} strokeWidth={2.25} style={styles.rowIcon} />
      <Text style={[styles.rowLabel, { color: accentColor }]}>{label}</Text>
      <Text style={[styles.rowDetail, { color: colors.text }]} numberOfLines={2}>
        {detail}
      </Text>
    </View>
  )
}

function ToolResultRow({ activity, colors }: { activity: Extract<TaskActivity, { type: 'tool_result' }>; colors: any }) {
  if (!activity.preview) return null

  const textColor = activity.isError ? (colors.accentRed ?? '#ef4444') : colors.textTertiary

  return (
    <View style={[styles.resultRow, { backgroundColor: activity.isError ? (colors.accentRed ?? '#ef4444') + '10' : colors.panelAlt }]}>
      <Text style={[styles.resultText, { color: textColor }]} numberOfLines={4}>
        {activity.isError ? '[error] ' : ''}{activity.preview}
      </Text>
    </View>
  )
}

function ThinkingRow({ activity, colors }: { activity: Extract<TaskActivity, { type: 'thinking' }>; colors: any }) {
  return (
    <View style={[styles.row, { borderLeftColor: colors.textTertiary }]}>
      <Brain color={colors.textTertiary} size={14} strokeWidth={2.25} style={styles.rowIcon} />
      <Text style={[styles.thinkingText, { color: colors.textTertiary }]} numberOfLines={3}>
        {activity.preview}
      </Text>
    </View>
  )
}

function TextRow({ activity, colors }: { activity: Extract<TaskActivity, { type: 'text' }>; colors: any }) {
  return (
    <View style={[styles.row, { borderLeftColor: colors.primary }]}>
      <MessageSquare color={colors.primary} size={14} strokeWidth={2.25} style={styles.rowIcon} />
      <Text style={[styles.textContent, { color: colors.text }]}>
        {activity.content}
      </Text>
    </View>
  )
}

function StatusRow({ activity, colors }: { activity: Extract<TaskActivity, { type: 'status' }>; colors: any }) {
  return (
    <View style={styles.statusRow}>
      <BauhausBadge label={activity.message} color={colors.primary} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing[3],
    paddingBottom: spacing[6],
    gap: spacing[1],
  },
  emptyText: {
    ...typeStyles.bodySmall,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[1],
  },
  logLine: {
    ...typeStyles.mono,
    paddingVertical: 1,
    maxWidth: 900,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing[1],
    paddingLeft: spacing[2],
    borderLeftWidth: 2,
    gap: spacing[1],
  },
  rowIcon: {
    marginTop: 2,
    flexShrink: 0,
  },
  rowLabel: {
    ...typeStyles.meta,
    fontWeight: '700',
    flexShrink: 0,
  },
  rowDetail: {
    ...typeStyles.bodySmall,
    flex: 1,
  },
  resultRow: {
    marginLeft: spacing[4],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  resultText: {
    ...typeStyles.mono,
    fontSize: 11,
  },
  thinkingText: {
    ...typeStyles.bodySmall,
    fontStyle: 'italic',
    flex: 1,
  },
  textContent: {
    ...typeStyles.body,
    flex: 1,
  },
  statusRow: {
    paddingVertical: spacing[2],
    alignItems: 'flex-start',
  },
  scrollButton: {
    position: 'absolute',
    bottom: spacing[4],
    alignSelf: 'center',
  },
})
