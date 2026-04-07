import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Plus, Square, Eye, Terminal, Scroll as ScrollIcon } from 'lucide-react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../contexts/ThemeContext'
import { useTaskStore } from '../stores/tasks'
import { useConnectionStore } from '../stores/connection'
import { useNewTaskDraftStore } from '../stores/new-task-draft'
import { useScriptsStore, type RunningScript } from '../stores/scripts'
import { usePreviewStore } from '../stores/preview'
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
import { typeStyles } from '../theme/typography'

type Props = {
  navigation: CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList, 'Tasks'>,
    NativeStackNavigationProp<RootStackParamList>
  >
}

type Tab = 'tasks' | 'scripts'

const TABS: Array<{ value: Tab; label: string; Icon: typeof ScrollIcon }> = [
  { value: 'tasks', label: 'Tasks', Icon: ScrollIcon },
  { value: 'scripts', label: 'Scripts', Icon: Terminal },
]

export default function TasksScreen({ navigation }: Props) {
  const { colors } = useTheme()
  const { layoutMode } = useAdaptiveLayout()
  const tasks = useTaskStore((s) => s.tasks)
  const activeTaskId = useTaskStore((s) => s.activeTaskId)
  const setTasks = useTaskStore((s) => s.setTasks)
  const setActiveTask = useTaskStore((s) => s.setActiveTask)
  const server = useConnectionStore((s) => s.server)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('tasks')

  // Script store state
  const runningScripts = useScriptsStore((s) => s.runningScripts)
  const stopScript = useScriptsStore((s) => s.stopScript)
  const openPreview = usePreviewStore((s) => s.openPreview)
  const taskLogs = useTaskStore((s) => s.taskLogs)

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

  const runningEntries = Array.from(runningScripts.entries())

  return (
    <>
      <AdaptiveShell style={{ backgroundColor: colors.background }} maxWidth={1360}>
        <View style={styles.container}>
          {/* Tab Header */}
          <View style={[styles.tabHeader, { borderBottomColor: colors.border }]}>
            <View
              style={[
                styles.tabContainer,
                { backgroundColor: colors.panelAlt, borderColor: colors.border },
              ]}
            >
              {TABS.map(({ value, label, Icon }) => {
                const selected = value === activeTab
                return (
                  <TouchableOpacity
                    key={value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    activeOpacity={0.7}
                    onPress={() => setActiveTab(value)}
                    style={[
                      styles.tab,
                      {
                        backgroundColor: selected ? colors.primary : 'transparent',
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Icon
                      size={16}
                      strokeWidth={2.25}
                      color={selected ? colors.primaryText : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.tabLabel,
                        { color: selected ? colors.primaryText : colors.textSecondary },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* Tab Content */}
          {activeTab === 'tasks' ? (
            <>
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
            </>
          ) : (
            /* Scripts Tab Content - Inline version of RunningScriptsSheet */
            <ScrollView contentContainerStyle={styles.scriptsContent} showsVerticalScrollIndicator={false}>
              {runningEntries.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Terminal color={colors.textTertiary} size={48} strokeWidth={1.5} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No running scripts</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                    Scripts you run will appear here for quick access.
                  </Text>
                </View>
              ) : (
                <View style={styles.scriptsList}>
                  {runningEntries.map(([key, script]) => (
                    <RunningScriptRow
                      key={key}
                      scriptKey={key}
                      script={script}
                      lastLines={getLastLines(taskLogs, script.taskId, 3)}
                      onStop={stopScript}
                      onPreview={openPreview}
                    />
                  ))}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </AdaptiveShell>

      {/* FAB - only show on Tasks tab */}
      {activeTab === 'tasks' && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary, borderColor: colors.border }]}
          onPress={() => navigation.navigate('NewTask')}
          activeOpacity={0.7}
        >
          <Plus color={colors.primaryText} size={24} strokeWidth={2.5} />
        </TouchableOpacity>
      )}
    </>
  )
}

function getLastLines(taskLogs: Map<string, string[]>, taskId: string, count: number): string[] {
  if (!taskId) return []
  const logs = taskLogs.get(taskId)
  if (!logs) return []
  return logs.slice(-count)
}

function RunningScriptRow({
  scriptKey,
  script,
  lastLines,
  onStop,
  onPreview,
}: {
  scriptKey: string
  script: RunningScript
  lastLines: string[]
  onStop: (key: string) => void
  onPreview: (targetUrl: string) => Promise<void>
}) {
  const { colors } = useTheme()

  return (
    <View style={[styles.scriptRow, { backgroundColor: colors.panelAlt }]}>
      <View style={styles.scriptHeader}>
        <View style={styles.scriptInfo}>
          <View style={styles.nameRow}>
            <View style={[styles.liveDot, { backgroundColor: '#22c55e' }]} />
            <Text style={[styles.scriptName, { color: colors.text }]}>{script.scriptName}</Text>
          </View>
          <Text style={[styles.scriptPath, { color: colors.textTertiary }]}>
            {script.packagePath === '.' ? 'root' : script.packagePath}
          </Text>
        </View>

        <View style={styles.scriptActions}>
          {script.detectedPort != null && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onPreview(`http://localhost:${script.detectedPort}`)}
              style={[styles.previewButton, { backgroundColor: colors.accentBlue }]}
            >
              <Eye color={colors.primaryText} size={14} strokeWidth={2.5} />
              <Text style={[styles.previewText, { color: colors.primaryText }]}>
                :{script.detectedPort}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onStop(scriptKey)}
            style={[styles.stopButton, { backgroundColor: colors.accentRed }]}
          >
            <Square color={colors.primaryText} size={14} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      {lastLines.length > 0 && (
        <View style={[styles.outputPreview, { backgroundColor: colors.background }]}>
          {lastLines.map((line, i) => (
            <Text
              key={i}
              style={[styles.outputLine, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {line}
            </Text>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabHeader: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 2,
  },
  tabContainer: {
    borderRadius: borderRadius.lg,
    padding: spacing[1],
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    alignSelf: 'flex-start',
  },
  tab: {
    minHeight: 40,
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
    borderWidth: 1.5,
  },
  tabLabel: {
    ...typeStyles.meta,
  },
  scriptsContent: {
    flexGrow: 1,
    padding: spacing[4],
  },
  scriptsList: {
    gap: spacing[3],
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    paddingVertical: spacing[8],
  },
  emptyTitle: {
    ...typographyScale.base,
    fontWeight: '700',
  },
  emptySubtitle: {
    ...typographyScale.sm,
    textAlign: 'center',
  },
  scriptRow: {
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[3],
  },
  scriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  scriptInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scriptName: {
    ...typographyScale.base,
    fontWeight: '700',
  },
  scriptPath: {
    ...typographyScale.xs,
    marginLeft: 8 + spacing[2],
  },
  scriptActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[2],
    height: 34,
  },
  previewText: {
    ...typographyScale.xs,
    fontWeight: '700',
  },
  stopButton: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outputPreview: {
    borderRadius: borderRadius.md,
    padding: spacing[2],
  },
  outputLine: {
    ...typographyScale.xs,
    fontFamily: 'monospace',
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
