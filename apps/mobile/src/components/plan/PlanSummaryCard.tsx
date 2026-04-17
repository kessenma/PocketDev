import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { spacing } from '@pocketdev/shared/theme'
import { typeStyles } from '../../theme/typography'
import { useTheme } from '../../contexts/ThemeContext'
import PlanBadge from './PlanBadge'
import { PlanCard, PlanCardContent, PlanCardDescription, PlanCardHeader, PlanCardTitle } from './PlanCard'
import type { PlanStatus } from './model'

type Props = {
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

export default function PlanSummaryCard({ title, description, agentName, status, stepCount, pendingQuestionCount }: Props) {
  const { colors } = useTheme()

  return (
    <PlanCard>
      <PlanCardHeader>
        <View style={styles.headerRow}>
          <View style={styles.titleBlock}>
            <PlanCardTitle>{title}</PlanCardTitle>
            <PlanCardDescription>{description}</PlanCardDescription>
          </View>
          <PlanBadge variant={STATUS_VARIANT[status]}>{status}</PlanBadge>
        </View>
      </PlanCardHeader>

      <PlanCardContent>
        <View style={styles.metricRow}>
          <View style={styles.metricCell}>
            <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>Agent</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>{agentName}</Text>
          </View>
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
        </View>
      </PlanCardContent>
    </PlanCard>
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
})
