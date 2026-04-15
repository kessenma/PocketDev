import React from 'react'
import {
  NativeModules,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native'
import { MorphCardSource } from 'react-native-morph-card'

const MORPH_AVAILABLE = !!NativeModules.RNCMorphCardModule
import { FlashList } from '@shopify/flash-list'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import type { Task } from '@pocketdev/shared/types'
import type { TaskStatus } from '@pocketdev/shared/schema'
import { useTheme } from '../../contexts/ThemeContext'
import { getRecentPrompts } from '../../services/storage'
import { typeStyles } from '../../theme/typography'

function getDisplayPrompt(prompt: string): string {
  const marker = 'User request:\n'
  const idx = prompt.indexOf(marker)
  return idx !== -1 ? prompt.slice(idx + marker.length).trim() : prompt
}

type Props = {
  tasks: Task[]
  activeTaskId?: string | null
  onTaskPress: (task: Task, sourceTag?: number) => void
  onRecentPromptPress?: (prompt: string) => void
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
  onRecentPromptPress,
  refreshing,
  onRefresh,
  tablet = false,
}: Props) {
  const { colors } = useTheme()
  const { width: windowWidth } = useWindowDimensions()
  const cardWidth = windowWidth - 2 * spacing[4]
  const recentPrompts = getRecentPrompts()

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
    <FlashList
      data={tasks}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => {
        const statusColor = STATUS_COLORS[item.status]
        const isActive = item.id === activeTaskId

        const cardContent = (
          <View style={[styles.taskCard, { backgroundColor: isActive ? colors.panelAlt : colors.panel }]}>
            <Text style={[styles.taskPrompt, { color: colors.text }]} numberOfLines={2}>
              {getDisplayPrompt(item.prompt)}
            </Text>
            <Text style={[styles.taskTime, { color: colors.textTertiary }]}>
              {formatTime(item.created_at)}
            </Text>
          </View>
        )

        return (
          <View style={[styles.taskCardFrame, { borderColor: statusColor }]}>
            {MORPH_AVAILABLE ? (
              <MorphCardSource
                width={cardWidth - 4}
                height={106}
                borderRadius={borderRadius.lg - 2}
                backgroundColor={isActive ? colors.panelAlt : colors.panel}
                onPress={(sourceTag) => onTaskPress(item, sourceTag)}
              >
                {cardContent}
              </MorphCardSource>
            ) : (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => onTaskPress(item)}
              >
                {cardContent}
              </TouchableOpacity>
            )}
          </View>
        )
      }}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
      refreshing={refreshing}
      onRefresh={onRefresh}
      ListHeaderComponent={
        recentPrompts.length > 0 && onRecentPromptPress ? (
          <View style={[styles.recentSection, { borderColor: colors.border }]}>
            <Text style={[styles.recentTitle, { color: colors.textTertiary }]}>Recent prompts</Text>
            {recentPrompts.slice(0, 5).map((item, i) => (
              <Pressable
                key={`recent-${i}`}
                style={[styles.recentItem, { borderColor: colors.border }]}
                onPress={() => onRecentPromptPress(item)}
              >
                <Text style={[styles.recentText, { color: colors.textSecondary }]} numberOfLines={2}>
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null
      }
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
  },
  listSeparator: {
    height: spacing[3],
  },
  taskCardFrame: {
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  taskCard: {
    padding: spacing[4],
    gap: spacing[2],
  },
  taskPrompt: {
    ...typeStyles.body,
  },
  taskTime: {
    ...typeStyles.meta,
  },
  recentSection: {
    borderBottomWidth: 2,
    paddingBottom: spacing[3],
    marginBottom: spacing[1],
    gap: spacing[2],
  },
  recentTitle: {
    ...typeStyles.sectionTitle,
  },
  recentItem: {
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
  },
  recentText: {
    ...typeStyles.bodySmall,
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
