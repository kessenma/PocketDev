import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { typeStyles } from '../../theme/typography'
import {
  ServerCard,
  ServerCardContent,
  ServerCardDescription,
  ServerCardHeader,
  ServerCardTitle,
} from './ServerCard'
import type { ServerMetric } from './model'

type Props = {
  metrics: ServerMetric[]
}

const TONE_COLORS: Record<ServerMetric['tone'], string> = {
  healthy: '#16a34a',
  warning: '#d97706',
  critical: '#dc2626',
  neutral: '#64748b',
}

export default function ServerMetricGrid({ metrics }: Props) {
  const { colors } = useTheme()

  return (
    <ServerCard>
      <ServerCardHeader>
        <ServerCardTitle>System snapshot</ServerCardTitle>
        <ServerCardDescription>
          Prototype cards for quick checks before digging into logs or shell commands.
        </ServerCardDescription>
      </ServerCardHeader>

      <ServerCardContent style={styles.grid}>
        {metrics.map((metric) => (
          <View
            key={metric.id}
            style={[styles.metricCard, { backgroundColor: colors.backgroundSecondary }]}
          >
            <View style={styles.metricHeader}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                {metric.label}
              </Text>
              <View
                style={[
                  styles.toneDot,
                  { backgroundColor: TONE_COLORS[metric.tone] },
                ]}
              />
            </View>
            <Text style={[styles.metricValue, { color: colors.text }]}>{metric.value}</Text>
            <Text style={[styles.metricDetail, { color: colors.textSecondary }]}>
              {metric.detail}
            </Text>
          </View>
        ))}
      </ServerCardContent>
    </ServerCard>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  metricCard: {
    minWidth: 150,
    flexGrow: 1,
    flexBasis: 160,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[2],
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[2],
  },
  metricLabel: {
    ...typeStyles.bodySmall,
  },
  toneDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  metricValue: {
    ...typeStyles.heading,
  },
  metricDetail: {
    ...typeStyles.bodySmall,
  },
})
