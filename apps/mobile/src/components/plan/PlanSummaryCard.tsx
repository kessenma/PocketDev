import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { spacing } from '@pocketdev/shared/theme'
import { typeStyles } from '../../theme/typography'
import { useTheme } from '../../contexts/ThemeContext'
import { useTaskStore } from '../../stores/tasks'
import PlanBadge from './PlanBadge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import type { AgentType } from '@pocketdev/shared/schema'
import type { PlanStatus } from './model'

type Props = {
  taskId: string
  title: string
  description: string
  agentName: string
  status: PlanStatus
  stepCount: number
  pendingQuestionCount: number
}

const STATUS_VARIANT: Record<PlanStatus, 'warning' | 'success' | 'error' | 'primary'> = {
  pending: 'warning',
  accepted: 'success',
  denied: 'error',
  revised: 'primary',
}

const PROVIDER_LABEL: Record<AgentType, string> = {
  claude: 'Claude',
  codex: 'Codex',
  copilot: 'Copilot',
  opencode: 'MiniMax',
  minimax: 'MiniMax',
  shell: 'Shell',
}

function formatModelName(model: string | null): string {
  if (!model) return '—'
  // "claude-opus-4-7" → "Opus 4.7", "claude-haiku-4-5-20251001" → "Haiku 4.5"
  const m = model.match(/claude-(\w+)-(\d+)-(\d+)/)
  if (m) {
    const tier = m[1]!.charAt(0).toUpperCase() + m[1]!.slice(1)
    return `${tier} ${m[2]}.${m[3]}`
  }
  // Trim long codex/other model IDs
  return model.length > 20 ? model.slice(0, 20) + '…' : model
}

function deriveEffort(model: string | null): string {
  if (!model) return '—'
  if (model.includes('opus')) return 'Max'
  if (model.includes('sonnet')) return 'Balanced'
  if (model.includes('haiku')) return 'Fast'
  return '—'
}

export default function PlanSummaryCard({
  taskId,
  title,
  description,
  agentName,
  status,
  stepCount,
  pendingQuestionCount,
}: Props) {
  const { colors } = useTheme()
  const task = useTaskStore((s) => s.tasks.get(taskId))

  const provider = task ? (PROVIDER_LABEL[task.agent_type] ?? task.agent_type) : agentName
  const modelLabel = formatModelName(task?.model ?? null)
  const effortLabel = deriveEffort(task?.model ?? null)

  return (
    <Card>
      <CardHeader>
        <View style={styles.headerRow}>
          <View style={styles.titleBlock}>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </View>
          <PlanBadge variant={STATUS_VARIANT[status]}>{status}</PlanBadge>
        </View>
      </CardHeader>

      <CardContent>
        <View style={styles.metricRow}>
          <View style={styles.metricCell}>
            <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>Provider</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>{provider}</Text>
          </View>
          <View style={styles.metricCell}>
            <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>Model</Text>
            <Text style={[styles.metricValue, { color: colors.text }]} numberOfLines={1}>{modelLabel}</Text>
          </View>
          <View style={styles.metricCell}>
            <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>Effort</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>{effortLabel}</Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.metricRow}>
          <View style={styles.metricCell}>
            <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>Steps</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>{stepCount}</Text>
          </View>
          <View style={styles.metricCell}>
            <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>Questions</Text>
            <Text style={[styles.metricValue, { color: pendingQuestionCount > 0 ? colors.warning : colors.text }]}>
              {pendingQuestionCount > 0 ? `${pendingQuestionCount} pending` : 'None'}
            </Text>
          </View>
          <View style={styles.metricCell} />
        </View>
      </CardContent>
    </Card>
  )
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  titleBlock: {
    flex: 1,
    gap: spacing[1],
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  metricCell: {
    flex: 1,
    gap: spacing[1],
  },
  metricLabel: {
    ...typeStyles.sectionTitle,
  },
  metricValue: {
    ...typeStyles.button,
  },
  divider: {
    height: 1,
    marginVertical: spacing[3],
  },
})
