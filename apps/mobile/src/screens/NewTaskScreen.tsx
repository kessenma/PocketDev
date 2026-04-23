import React from 'react'
import { View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useTheme } from '../contexts/ThemeContext'
import AdaptiveShell from '../components/layout/AdaptiveShell'
import NewTaskForm from '../components/tasks/NewTaskForm'
import { useTaskStore } from '../stores/tasks'
import type { RootStackParamList } from '../navigation/types'

type Props = NativeStackScreenProps<RootStackParamList, 'NewTask'>

export default function NewTaskScreen({ navigation }: Props) {
  const { colors } = useTheme()

  function handleSubmitted(existingTaskIds: ReadonlySet<string>) {
    const tryNavigate = (attemptsLeft: number) => {
      const tasks = useTaskStore.getState().tasks
      for (const id of tasks.keys()) {
        if (!existingTaskIds.has(id)) {
          navigation.replace('TaskDetail', { taskId: id })
          return
        }
      }
      if (attemptsLeft > 0) {
        setTimeout(() => tryNavigate(attemptsLeft - 1), 500)
      } else {
        navigation.goBack()
      }
    }
    setTimeout(() => tryNavigate(4), 300)
  }

  return (
    <AdaptiveShell style={{ backgroundColor: colors.background }} contentStyle={{ paddingTop: 0 }} maxWidth={960}>
      <View style={{ flex: 1 }}>
        <NewTaskForm onSubmitted={handleSubmitted} />
      </View>
    </AdaptiveShell>
  )
}
