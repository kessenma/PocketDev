import React from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import { Plus } from 'lucide-react-native'
import { borderRadius } from '@pocketdev/shared/theme'
import { useTheme } from '../contexts/ThemeContext'
import { useTaskStore } from '../stores/tasks'
import { useConnectionStore } from '../stores/connection'
import { useNewTaskDraftStore } from '../stores/new-task-draft'
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

  function handleRecentPromptPress(prompt: string) {
    useNewTaskDraftStore.getState().applyRecentPrompt(prompt)
    navigation.navigate('NewTask')
  }

  function handleTaskPress(task: Task) {
    setActiveTask(task.id)

    if (layoutMode === 'tabletSplit') {
      return
    }

    navigation.navigate('TaskDetail', { taskId: task.id })
  }

  return (
    <>
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
              onRecentPromptPress={handleRecentPromptPress}
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          )}
        </View>
      </AdaptiveShell>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, borderColor: colors.border }]}
        onPress={() => navigation.navigate('NewTask')}
        activeOpacity={0.7}
      >
        <Plus color={colors.primaryText} size={24} strokeWidth={2.5} />
      </TouchableOpacity>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
