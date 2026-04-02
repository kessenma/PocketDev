import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { GitCard, GitCardContent, GitCardDescription, GitCardHeader, GitCardTitle } from './GitCard'
import type { GitFileChange } from './model'

type Props = {
  changes: GitFileChange[]
}

export default function GitStatusSummary({ changes }: Props) {
  const { colors } = useTheme()

  const metrics = [
    {
      label: 'Staged',
      value: changes.filter((change) => change.staged).length,
      tone: colors.primary,
    },
    {
      label: 'Modified',
      value: changes.filter((change) => change.kind === 'modified' || change.kind === 'renamed').length,
      tone: colors.warning,
    },
    {
      label: 'Added',
      value: changes.filter((change) => change.kind === 'added').length,
      tone: colors.success,
    },
    {
      label: 'Deleted',
      value: changes.filter((change) => change.kind === 'deleted').length,
      tone: colors.error,
    },
  ]

  return (
    <GitCard>
      <GitCardHeader>
        <GitCardTitle>Status</GitCardTitle>
        <GitCardDescription>Quick working tree scan for one-handed review.</GitCardDescription>
      </GitCardHeader>

      <GitCardContent>
        <View style={styles.grid}>
          {metrics.map((metric) => (
            <View
              key={metric.label}
              style={[styles.metric, { backgroundColor: colors.backgroundSecondary }]}
            >
              <View style={[styles.swatch, { backgroundColor: metric.tone }]} />
              <Text style={[styles.metricValue, { color: colors.text }]}>{metric.value}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{metric.label}</Text>
            </View>
          ))}
        </View>
      </GitCardContent>
    </GitCard>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  metric: {
    width: '47%',
    minHeight: 96,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    justifyContent: 'space-between',
  },
  swatch: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  metricValue: {
    ...typographyScale['2xl'],
    fontWeight: '700',
  },
  metricLabel: {
    ...typographyScale.sm,
    fontWeight: '500',
  },
})