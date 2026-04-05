import React from 'react'
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import type { Task } from '@pocketdev/shared/types'
import type { TaskStatus } from '@pocketdev/shared/schema'
import { useTheme } from '../../contexts/ThemeContext'
import BauhausBadge from '../shared/BauhausBadge'
import { typeStyles } from '../../theme/typography'

type Props = {
  tasks: Task[]
  activeTaskId?: string | null
  onTaskPress: (task: Task) => void
  refreshing: boolean
  onRefresh: () => void
  tablet?: boolean
}

const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: '#a3a3a3',
  running: '#3b82f6',
  completed: '#22c55e',
  failed: '#ef4444',
  killed: '#737373',
}

export default function TaskListPane({
  tasks,
  activeTaskId,
  onTaskPress,
  refreshing,
  onRefresh,
  tablet = false,
}: Props) {
  const { colors } = useTheme()

  if (tasks.length === 0 && !refreshing) {
    return (
      <View
        style={[
          styles.emptyContainer,
          tablet && styles.emptyContainerCard,
          tablet && {
            backgroundColor: colors.panel,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No tasks yet</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Start a new task to run work on your Linux server from iPad or phone.
        </Text>
      </View>
    )
  }

  return (
    <FlatList
      data={tasks}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => {
        const statusColor = STATUS_COLORS[item.status]
        const isActive = item.id === activeTaskId

        return (
          <TouchableOpacity
            style={[
              styles.taskCard,
              {
                backgroundColor: isActive ? colors.panelAlt : colors.panel,
                borderColor: colors.border,
              },
            ]}
            onPress={() => onTaskPress(item)}
            activeOpacity={0.7}
          >
            <View style={styles.taskHeader}>
              <BauhausBadge label={item.status} color={statusColor} />
              <Text style={[styles.agentBadge, { color: colors.textTertiary }]}>{item.agent_type}</Text>
            </View>
            <Text style={[styles.taskPrompt, { color: colors.text }]} numberOfLines={2}>
              {item.prompt}
            </Text>
            <Text style={[styles.taskTime, { color: colors.textTertiary }]}>
              {formatTime(item.created_at)}
            </Text>
          </TouchableOpacity>
        )
      }}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    />
  )
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()

  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return d.toLocaleDateString()
}

const styles = StyleSheet.create({
  list: {
    padding: spacing[4],
    gap: spacing[3],
  },
  taskCard: {
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[2],
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  agentBadge: {
    ...typeStyles.meta,
    marginLeft: 'auto',
  },
  taskPrompt: {
    ...typeStyles.body,
  },
  taskTime: {
    ...typeStyles.meta,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  emptyContainerCard: {
    borderWidth: 2,
    borderRadius: borderRadius.xl,
  },
  emptyTitle: {
    ...typeStyles.screenTitle,
  },
  emptySubtitle: {
    ...typeStyles.body,
    textAlign: 'center',
    marginTop: spacing[2],
    maxWidth: 320,
  },
})
