import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { ContainerSummary } from './model'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import {
  ContainerCard,
  ContainerCardContent,
  ContainerCardDescription,
  ContainerCardHeader,
  ContainerCardTitle,
} from './ContainerCard'
import { typeStyles } from '../../theme/typography'

type Props = {
  containers: ContainerSummary[]
}

export default function ContainerStatusSummary({ containers }: Props) {
  const { colors } = useTheme()

  const metrics = [
    {
      label: 'Running',
      value: containers.filter((container) => container.state === 'running').length,
      tone: colors.success,
    },
    {
      label: 'Restarting',
      value: containers.filter((container) => container.state === 'restarting').length,
      tone: colors.warning,
    },
    {
      label: 'Exited',
      value: containers.filter((container) => container.state === 'exited').length,
      tone: colors.error,
    },
    {
      label: 'Paused',
      value: containers.filter((container) => container.state === 'paused').length,
      tone: colors.primary,
    },
  ]

  return (
    <ContainerCard>
      <ContainerCardHeader>
        <ContainerCardTitle>Status</ContainerCardTitle>
        <ContainerCardDescription>Quick Docker ps -a scan across running and failed containers.</ContainerCardDescription>
      </ContainerCardHeader>

      <ContainerCardContent>
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
      </ContainerCardContent>
    </ContainerCard>
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
    ...typeStyles.heading,
  },
  metricLabel: {
    ...typeStyles.bodySmall,
  },
})
