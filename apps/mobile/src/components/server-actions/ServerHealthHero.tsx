import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'

type Props = {
  serverLabel: string
  uptime: string
  incidentCount: number
  summary: string
}

export default function ServerHealthHero({
  serverLabel,
  uptime,
  incidentCount,
  summary,
}: Props) {
  const { colors } = useTheme()

  return (
    <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.copy}>
        <Text style={[styles.eyebrow, { color: colors.textTertiary }]}>Server Actions</Text>
        <Text style={[styles.title, { color: colors.text }]}>{serverLabel}</Text>
        <Text style={[styles.summary, { color: colors.textSecondary }]}>{summary}</Text>
      </View>

      <View style={styles.metrics}>
        <View style={[styles.pill, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.pillLabel, { color: colors.textTertiary }]}>Uptime</Text>
          <Text style={[styles.pillValue, { color: colors.text }]}>{uptime}</Text>
        </View>
        <View style={[styles.pill, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.pillLabel, { color: colors.textTertiary }]}>Open Incidents</Text>
          <Text style={[styles.pillValue, { color: colors.text }]}>
            {incidentCount}
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  hero: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    gap: spacing[4],
  },
  copy: {
    gap: spacing[1],
  },
  eyebrow: {
    ...typographyScale.xs,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  title: {
    ...typographyScale['2xl'],
    fontWeight: '700',
  },
  summary: {
    ...typographyScale.base,
    maxWidth: 760,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  pill: {
    minWidth: 132,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    gap: spacing[1],
  },
  pillLabel: {
    ...typographyScale.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  pillValue: {
    ...typographyScale.lg,
    fontWeight: '700',
  },
})
