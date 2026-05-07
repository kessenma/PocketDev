import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { typeStyles } from '../../theme/typography'
import { useTheme } from '../../contexts/ThemeContext'
import PlanBadge from './PlanBadge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import type { PlanEntry, PlanStatus } from './model'

type Props = {
  plans: PlanEntry[]
  onSelect: (planId: string) => void
}

const STATUS_VARIANT: Record<PlanStatus, 'warning' | 'success' | 'error' | 'primary'> = {
  pending: 'warning',
  accepted: 'success',
  denied: 'error',
  revised: 'primary',
}

export default function PlanHistoryList({ plans, onSelect }: Props) {
  const { colors } = useTheme()

  return (
    <Card>
      <CardHeader>
        <CardTitle>History</CardTitle>
        <CardDescription>
          {plans.length > 0 ? `${plans.length} resolved plan${plans.length > 1 ? 's' : ''}` : 'No plans resolved yet.'}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {plans.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No history</Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              Accepted and denied plans will appear here.
            </Text>
          </View>
        ) : (
          plans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              activeOpacity={0.7}
              onPress={() => onSelect(plan.id)}
              style={[styles.historyRow, { backgroundColor: colors.backgroundSecondary }]}
            >
              <View style={styles.historyHeader}>
                <View style={styles.historyTitleBlock}>
                  <Text style={[styles.historyTitle, { color: colors.text }]} numberOfLines={1}>
                    {plan.title}
                  </Text>
                  <Text style={[styles.historyMeta, { color: colors.textTertiary }]}>
                    {plan.agentName} · {plan.resolvedRelativeTime ?? plan.createdRelativeTime}
                  </Text>
                </View>
                <PlanBadge variant={STATUS_VARIANT[plan.status]}>{plan.status}</PlanBadge>
              </View>
              {plan.userNotes ? (
                <Text style={[styles.historyNotes, { color: colors.textSecondary }]} numberOfLines={2}>
                  {plan.userNotes}
                </Text>
              ) : null}
            </TouchableOpacity>
          ))
        )}
      </CardContent>
    </Card>
  )
}

const styles = StyleSheet.create({
  historyRow: {
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[2],
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  historyTitleBlock: {
    flex: 1,
    gap: spacing[1],
  },
  historyTitle: {
    ...typeStyles.button,
  },
  historyMeta: {
    ...typeStyles.meta,
  },
  historyNotes: {
    ...typeStyles.bodySmall,
  },
  emptyState: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[2],
    minHeight: 120,
    justifyContent: 'center',
  },
  emptyTitle: {
    ...typeStyles.bodyBold,
  },
  emptyBody: {
    ...typeStyles.bodySmall,
  },
})
