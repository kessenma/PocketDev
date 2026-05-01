import React, { useState } from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import ReanimatedLib, {
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  useDerivedValue,
  interpolate,
  runOnUI,
  scrollTo as reanimatedScrollTo,
} from 'react-native-reanimated'
import { Plus } from 'lucide-react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
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
import BauhausTabs from '../components/shared/BauhausTabs'
import TaskListPane from '../components/tasks/TaskListPane'
import TaskWorkspace from '../components/tasks/TaskWorkspace'
import RecentPromptsPane from '../components/tasks/RecentPromptsPane'

const TABS = [{ label: 'Tasks' }, { label: 'Prompts' }]

type Props = {
  navigation: CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList, 'Tasks'>,
    NativeStackNavigationProp<RootStackParamList>
  >
}

export default function TasksScreen({ navigation }: Props) {
  const { colors } = useTheme()
  const { top } = useSafeAreaInsets()
  const { layoutMode } = useAdaptiveLayout()
  const tasks = useTaskStore((s) => s.tasks)
  const activeTaskId = useTaskStore((s) => s.activeTaskId)
  const setTasks = useTaskStore((s) => s.setTasks)
  const setActiveTask = useTaskStore((s) => s.setActiveTask)
  const server = useConnectionStore((s) => s.server)
  const refreshFromServer = useTaskStore((s) => s.refreshFromServer)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [pageWidth, setPageWidth] = useState(0)
  const pagerRef = useAnimatedRef<ReanimatedLib.ScrollView>()
  const scrollX = useSharedValue(0)
  const pageWidthShared = useSharedValue(0)
  const scrollIndex = useDerivedValue(() =>
    pageWidthShared.value > 0 ? scrollX.value / pageWidthShared.value : 0,
  )

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(scrollIndex.value, [0, 1], [0, 96], 'clamp') }],
  }))

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x
    },
  })

  React.useEffect(() => {
    void refreshFromServer().catch(() => {})
  }, [refreshFromServer, server])

  const taskList = React.useMemo(
    () =>
      Array.from(tasks.values())
        .filter((t) => t.agent_type !== 'shell')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
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

  function handleTaskPress(task: Task, sourceTag?: number) {
    setActiveTask(task.id)

    if (layoutMode === 'tabletSplit') {
      return
    }

    navigation.navigate('TaskDetail', { taskId: task.id, sourceTag })
  }

  function handleTabChange(index: number) {
    setActiveTab(index)
    if (pageWidth > 0) {
      runOnUI(() => {
        'worklet'
        reanimatedScrollTo(pagerRef, index * pageWidth, 0, true)
      })()
    }
  }

  function handleScrollEnd(event: { nativeEvent: { contentOffset: { x: number } } }) {
    if (pageWidth > 0) {
      const newIndex = Math.round(event.nativeEvent.contentOffset.x / pageWidth)
      setActiveTab(newIndex)
    }
  }

  function handlePagerLayout(event: { nativeEvent: { layout: { width: number } } }) {
    const w = event.nativeEvent.layout.width
    setPageWidth(w)
    pageWidthShared.value = w
  }

  return (
    <>
      <AdaptiveShell style={{ backgroundColor: colors.background, paddingTop: top }} maxWidth={1360}>
        <View style={styles.container}>
          <BauhausTabs tabs={TABS} scrollIndex={scrollIndex} onChange={handleTabChange} />

          <View style={styles.pager} onLayout={handlePagerLayout}>
            {pageWidth > 0 && (
              <ReanimatedLib.ScrollView
                ref={pagerRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                bounces={false}
                scrollEventThrottle={16}
                onScroll={scrollHandler}
                onMomentumScrollEnd={handleScrollEnd}
                style={styles.scroll}
              >
                <View style={[styles.page, { width: pageWidth }]}>
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

                <View style={[styles.page, { width: pageWidth }]}>
                  <RecentPromptsPane onPromptPress={handleRecentPromptPress} />
                </View>
              </ReanimatedLib.ScrollView>
            )}
          </View>
        </View>
      </AdaptiveShell>

      <ReanimatedLib.View style={[styles.fab, fabStyle]}>
        <TouchableOpacity
          style={[styles.fabInner, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('NewTask')}
          activeOpacity={0.7}
        >
          <Plus color={colors.primaryText} size={24} strokeWidth={2.5} />
        </TouchableOpacity>
      </ReanimatedLib.View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pager: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
  },
  fabInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
