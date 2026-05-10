import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { Task } from '@pocketdev/shared/types'
import { spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import SplitViewLayout from '../layout/SplitViewLayout'
import TaskDetailPane from './TaskDetailPane'
import TaskListPane from './TaskListPane'
import { Card } from '../ui/Card'
import { typeStyles } from '../../theme/typography'

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
        <Card style={styles.panel} accentColor={colors.accentBlue}>
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
        </Card>
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
    overflow: 'hidden',
  },
  panelHeader: {
    paddingBottom: spacing[3],
    borderBottomWidth: 2,
  },
  panelEyebrow: {
    ...typeStyles.sectionTitle,
  },
  panelTitle: {
    ...typeStyles.screenTitle,
    marginTop: spacing[1],
  },
})
