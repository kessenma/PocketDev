import React from 'react'
import {
  Image,
  NativeModules,
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
import { typeStyles } from '../../theme/typography'
import { Assets } from '../../../assets'

function getAgentLogo(agentType: string, isDark: boolean) {
  switch (agentType) {
    case 'claude': return isDark ? Assets.claudeWhite : Assets.claudeBlack
    case 'codex': return isDark ? Assets.codexWhite : Assets.codexBlack
    case 'copilot': return isDark ? Assets.githubCopilotWhite : Assets.githubCopilotBlack
    case 'minimax':
    case 'opencode': return isDark ? Assets.minimaxWhite : Assets.minimaxBlack
    default: return null
  }
}

function getDisplayPrompt(prompt: string): string {
  const marker = 'User request:\n'
  const idx = prompt.indexOf(marker)
  return idx !== -1 ? prompt.slice(idx + marker.length).trim() : prompt
}

type Props = {
  tasks: Task[]
  activeTaskId?: string | null
  onTaskPress: (task: Task, sourceTag?: number) => void
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
  const { colors, isDark } = useTheme()
  const { width: windowWidth } = useWindowDimensions()
  const cardWidth = windowWidth - 2 * spacing[4]

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

        const agentLogo = getAgentLogo(item.agent_type, isDark)

        const cardContent = (
          <View style={[styles.taskCard, { backgroundColor: isActive ? colors.panelAlt : colors.panel }]}>
            <Text style={[styles.taskPrompt, { color: colors.text }]} numberOfLines={2}>
              {getDisplayPrompt(item.prompt)}
            </Text>
            <View style={styles.taskMeta}>
              {agentLogo ? (
                <Image source={agentLogo} style={styles.agentLogo} />
              ) : null}
              <Text style={[styles.taskTime, { color: colors.textTertiary }]}>
                {formatTime(item.created_at)}
              </Text>
            </View>
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
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  agentLogo: {
    width: 14,
    height: 14,
    resizeMode: 'contain',
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
