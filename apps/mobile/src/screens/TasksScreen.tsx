import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from '../contexts/ThemeContext'
import { useTaskStore } from '../stores/tasks'
import { useConnectionStore } from '../stores/connection'
import { fetchTaskList } from '../services/api'
import type { Task } from '@pocketdev/shared/types'
import type { CompositeNavigationProp } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { MainTabParamList, RootStackParamList } from '../navigation/types'
import { useAdaptiveLayout } from '../hooks/useAdaptiveLayout'
import AdaptiveShell from '../components/layout/AdaptiveShell'
import TaskListPane from '../components/tasks/TaskListPane'
import TaskWorkspace from '../components/tasks/TaskWorkspace'

type Props = {
  navigation: CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList, 'Tasks'>,
    NativeStackNavigationProp<RootStackParamList>
  >
}

export default function TasksScreen({ navigation }: Props) {
  const { colors } = useTheme()
  const { layoutMode } = useAdaptiveLayout()
  const tasks = useTaskStore((s) => s.tasks)
  const activeTaskId = useTaskStore((s) => s.activeTaskId)
  const setTasks = useTaskStore((s) => s.setTasks)
  const setActiveTask = useTaskStore((s) => s.setActiveTask)
  const server = useConnectionStore((s) => s.server)
  const [refreshing, setRefreshing] = React.useState(false)

  const taskList = React.useMemo(
    () =>
      Array.from(tasks.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [tasks],
  )

  React.useEffect(() => {
    if (layoutMode !== 'tabletSplit') return
    if (activeTaskId && tasks.has(activeTaskId)) return

    const nextTask = taskList[0]
    setActiveTask(nextTask?.id ?? null)
  }, [activeTaskId, layoutMode, setActiveTask, taskList, tasks])

  async function handleRefresh() {
    if (!server) return
    setRefreshing(true)
    try {
      const data = await fetchTaskList(server.ip, server.port)
      setTasks(data as Task[])
    } catch {
      // Silent fail on refresh
    } finally {
      setRefreshing(false)
    }
  }

  function handleTaskPress(task: Task) {
    setActiveTask(task.id)

    if (layoutMode === 'tabletSplit') {
      return
    }

    navigation.navigate('TaskDetail', { taskId: task.id })
  }

  return (
    <AdaptiveShell style={{ backgroundColor: colors.background }} maxWidth={1360}>
      <View style={styles.container}>
        {layoutMode === 'tabletSplit' ? (
          <TaskWorkspace
            tasks={taskList}
            activeTaskId={activeTaskId}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            onTaskPress={handleTaskPress}
          />
        ) : (
          <TaskListPane
            tasks={taskList}
            activeTaskId={activeTaskId}
            onTaskPress={handleTaskPress}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        )}
      </View>
    </AdaptiveShell>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})
