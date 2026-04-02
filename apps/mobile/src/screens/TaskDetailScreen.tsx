import React from 'react'
import { useTheme } from '../contexts/ThemeContext'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../navigation/types'
import AdaptiveShell from '../components/layout/AdaptiveShell'
import TaskDetailPane from '../components/tasks/TaskDetailPane'

type Props = NativeStackScreenProps<RootStackParamList, 'TaskDetail'>

export default function TaskDetailScreen({ route }: Props) {
  const { colors } = useTheme()

  return (
    <AdaptiveShell style={{ backgroundColor: colors.background }} maxWidth={1280}>
      <TaskDetailPane
        taskId={route.params.taskId}
        emptyTitle="Task not found"
        emptyBody="The selected task is no longer available in local state."
      />
    </AdaptiveShell>
  )
}
