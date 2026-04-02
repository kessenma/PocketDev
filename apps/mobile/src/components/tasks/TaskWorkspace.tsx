import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { Task } from '@pocketdev/shared/types'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import SplitViewLayout from '../layout/SplitViewLayout'
import TaskDetailPane from './TaskDetailPane'
import TaskListPane from './TaskListPane'

type Props = {
  tasks: Task[]
  activeTaskId: string | null
  refreshing: boolean
  onRefresh: () => void
  onTaskPress: (task: Task) => void
}

export default function TaskWorkspace({
  tasks,
  activeTaskId,
  refreshing,
  onRefresh,
  onTaskPress,
}: Props) {
  const { colors } = useTheme()

  return (
    <SplitViewLayout
      leading={
        <View style={[styles.panel, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
          <View style={[styles.panelHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.panelEyebrow, { color: colors.textTertiary }]}>Tasks</Text>
            <Text style={[styles.panelTitle, { color: colors.text }]}>Recent work</Text>
          </View>
          <TaskListPane
            tasks={tasks}
            activeTaskId={activeTaskId}
            onTaskPress={onTaskPress}
            refreshing={refreshing}
            onRefresh={onRefresh}
            tablet
          />
        </View>
      }
      trailing={
        <TaskDetailPane
          taskId={activeTaskId}
          emptyTitle="Select a task"
          emptyBody="Keep the task list open while you inspect logs, status, and prompt details on the right."
        />
      }
    />
  )
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  panelHeader: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  panelEyebrow: {
    ...typographyScale.xs,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  panelTitle: {
    ...typographyScale.xl,
    fontWeight: '700',
    marginTop: spacing[1],
  },
})
