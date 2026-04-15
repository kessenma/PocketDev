import React from 'react'
import { Image, LayoutAnimation, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Check, ChevronDown, ChevronUp, Copy, GalleryVerticalEnd, SquareTerminal, Terminal, X } from 'lucide-react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import type { AgentType } from '@pocketdev/shared/schema'
import { useTheme } from '../contexts/ThemeContext'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../navigation/types'
import { MorphCardTarget, morphCollapse } from 'react-native-morph-card'
import AdaptiveShell from '../components/layout/AdaptiveShell'
import TaskDetailPane from '../components/tasks/TaskDetailPane'
import BauhausBadge from '../components/shared/BauhausBadge'
import BauhausButton from '../components/shared/BauhausButton'
import { useTaskStore } from '../stores/tasks'
import { typeStyles } from '../theme/typography'
import { Assets } from '../../assets'

type Props = NativeStackScreenProps<RootStackParamList, 'TaskDetail'>

export default function TaskDetailScreen({ navigation, route }: Props) {
  const { colors, isDark } = useTheme()
  const { taskId, sourceTag } = route.params
  const hasMorph = sourceTag != null
  const isClosingRef = React.useRef(false)

  // Header state (only used when hasMorph)
  const [showRawLogs, setShowRawLogs] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const [copyTrigger, setCopyTrigger] = React.useState(0)
  const [promptExpanded, setPromptExpanded] = React.useState(false)

  function togglePrompt() {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      LayoutAnimation.configureNext({
        duration: 420,
        create: {
          type: LayoutAnimation.Types.spring,
          springDamping: 0.82,
          property: LayoutAnimation.Properties.opacity,
        },
        update: {
          type: LayoutAnimation.Types.spring,
          springDamping: 0.82,
        },
        delete: {
          type: LayoutAnimation.Types.spring,
          springDamping: 0.82,
          property: LayoutAnimation.Properties.opacity,
        },
      })
    }
    setPromptExpanded((v) => !v)
  }

  const task = useTaskStore((s) => s.tasks.get(taskId))
  const killTask = useTaskStore((s) => s.killTask)
  const isRunning = task?.status === 'running'
  const STATUS_COLORS: Record<string, string> = {
    pending: '#a3a3a3', running: '#3b82f6', completed: '#22c55e', failed: '#ef4444', killed: '#737373',
  }
  const statusColor = STATUS_COLORS[task?.status ?? 'pending']
  const elapsed = task?.started_at ? formatElapsed(task.started_at, task.completed_at ?? null) : null
  const fullPrompt = task ? extractUserRequest(task.prompt) : null

  async function handleClose() {
    if (isClosingRef.current) return
    isClosingRef.current = true
    try {
      if (sourceTag != null) await morphCollapse(sourceTag)
    } catch {}
    navigation.goBack()
  }

  // Safety net: if the screen unmounts without going through handleClose (e.g. Fast Refresh
  // after a code change, or unexpected navigation), release the native morph state so the
  // source card can be tapped again.
  React.useEffect(() => {
    if (sourceTag == null) return
    return () => {
      if (!isClosingRef.current) {
        void morphCollapse(sourceTag).catch(() => {})
      }
    }
  }, [sourceTag]) // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (!hasMorph) return
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={handleClose}
          activeOpacity={0.7}
          style={[styles.headerCloseButton, { backgroundColor: colors.panel, borderColor: colors.border }]}
        >
          <X color={colors.textSecondary} size={16} strokeWidth={2.5} />
        </TouchableOpacity>
      ),
    })
    return navigation.addListener('beforeRemove', (e) => {
      if (isClosingRef.current) return
      e.preventDefault()
      void handleClose()
    })
  }, [hasMorph, navigation, colors]) // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (!task) return
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerTitle}>
          <AgentHeaderIcon agentType={task.agent_type} isDark={isDark} />
          <Text style={[typeStyles.sectionTitle, { fontWeight: '800', color: colors.text }]}>Task</Text>
        </View>
      ),
    })
  }, [task?.agent_type, isDark, colors.text]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {hasMorph && (
        <>
          <View style={[styles.actionRow, { borderBottomColor: colors.border }]}>
            <View style={styles.actionLeft}>
              {task && <BauhausBadge label={task.status} color={statusColor} />}
              {elapsed && <Text style={[styles.elapsed, { color: colors.textTertiary }]}>{elapsed}</Text>}
            </View>
            <View style={styles.actionRight}>
              <TouchableOpacity
                onPress={() => setCopyTrigger((t) => t + 1)}
                activeOpacity={0.7}
                style={[styles.iconBtn, { backgroundColor: copied ? '#22c55e18' : 'transparent', borderColor: copied ? '#22c55e' : colors.border }]}
              >
                {copied
                  ? <Check color="#22c55e" size={14} strokeWidth={2.25} />
                  : <Copy color={colors.textTertiary} size={14} strokeWidth={2.25} />}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowRawLogs((v) => !v)}
                activeOpacity={0.7}
                style={[styles.iconBtn, { backgroundColor: showRawLogs ? colors.primary + '18' : 'transparent', borderColor: colors.border }]}
              >
                {showRawLogs
                  ? <SquareTerminal color={colors.primary} size={14} strokeWidth={2.25} />
                  : <GalleryVerticalEnd color={colors.textTertiary} size={14} strokeWidth={2.25} />
                }
              </TouchableOpacity>
              {isRunning && (
                <BauhausButton variant="danger" compact onPress={() => killTask(task!.id)}>
                  Kill
                </BauhausButton>
              )}
            </View>
          </View>

          <View style={[styles.morphCard, { borderColor: colors.border }]}>
            {/* Collapses to zero height when expanded, revealing the full prompt in its place */}
            <View style={{ height: promptExpanded ? 0 : undefined, overflow: 'hidden' }}>
              <MorphCardTarget sourceTag={sourceTag} width="100%" height={110} borderRadius={0} />
            </View>
            {fullPrompt && (
              <>
                {promptExpanded && (
                  <Text style={[typeStyles.body, styles.morphCardExpandText, { color: colors.text }]}>
                    {fullPrompt}
                  </Text>
                )}
                <TouchableOpacity
                  style={[styles.morphCardMoreRow, { borderTopColor: colors.border }]}
                  onPress={togglePrompt}
                  activeOpacity={0.7}
                >
                  {promptExpanded
                    ? <ChevronUp color={colors.textTertiary} size={12} strokeWidth={2.5} />
                    : <ChevronDown color={colors.textTertiary} size={12} strokeWidth={2.5} />}
                  <Text style={[styles.morphCardMoreLabel, { color: colors.textTertiary }]}>
                    {promptExpanded ? 'less' : 'more'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </>
      )}
      <AdaptiveShell style={{ backgroundColor: colors.background }} maxWidth={1280}>
        <TaskDetailPane
          taskId={taskId}
          hideHeader={hasMorph}
          hideStatusBar={hasMorph}
          rawLogsActive={hasMorph ? showRawLogs : undefined}
          onRawLogsToggle={hasMorph ? () => setShowRawLogs((v) => !v) : undefined}
          copyTrigger={hasMorph ? copyTrigger : undefined}
          onCopied={hasMorph ? () => { setCopied(true); setTimeout(() => setCopied(false), 2000) } : undefined}
          emptyTitle="Task not found"
          emptyBody="The selected task is no longer available in local state."
        />
      </AdaptiveShell>
    </View>
  )
}

function AgentHeaderIcon({ agentType, isDark }: { agentType: AgentType; isDark: boolean }) {
  if (agentType === 'shell') {
    return <Terminal size={16} color={isDark ? '#888' : '#666'} strokeWidth={1.5} />
  }
  const source = ({
    claude: isDark ? Assets.claudeWhite : Assets.claudeBlack,
    codex: isDark ? Assets.codexWhite : Assets.codexBlack,
    copilot: isDark ? Assets.githubCopilotWhite : Assets.githubCopilotBlack,
  } as Record<string, any>)[agentType]
  if (!source) return null
  return <Image source={source} style={styles.headerAgentIcon} resizeMode="contain" />
}

function extractUserRequest(prompt: string): string {
  const marker = 'User request:\n'
  const idx = prompt.indexOf(marker)
  return idx !== -1 ? prompt.slice(idx + marker.length).trim() : prompt
}

function formatElapsed(startedAt: string, completedAt: string | null): string {
  const start = new Date(startedAt).getTime()
  const end = completedAt ? new Date(completedAt).getTime() : Date.now()
  const seconds = Math.floor((end - start) / 1000)
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerAgentIcon: {
    width: 16,
    height: 16,
  },
  morphCard: {
    borderBottomWidth: 2,
    overflow: 'hidden',
  },
  morphCardMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    paddingVertical: spacing[1],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  morphCardMoreLabel: {
    ...typeStyles.meta,
  },
  morphCardExpandText: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
  },
  headerCloseButton: {
    width: 30,
    height: 30,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderBottomWidth: 2,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  actionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  elapsed: {
    ...typeStyles.meta,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
