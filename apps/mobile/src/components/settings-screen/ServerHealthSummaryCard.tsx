import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Activity, ChevronRight } from 'lucide-react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { useServerActionsStore } from '../../stores/server-actions'
import { typeStyles } from '../../theme/typography'
import { Card, CardTitle } from '../ui/Card'
import type { ServerMetric } from '../server-actions/model'

type Props = {
  onViewHealth: () => void
}

function deriveHealthColor(errorCount: number, metrics: ServerMetric[]): string {
  if (errorCount > 0 || metrics.some((m) => m.tone === 'critical')) return '#dc2626'
  if (metrics.some((m) => m.tone === 'warning')) return '#d97706'
  if (metrics.length > 0) return '#16a34a'
  return '#64748b'
}

export default function ServerHealthSummaryCard({ onViewHealth }: Props) {
  const { colors } = useTheme()
  const uptime = useServerActionsStore((s) => s.uptime)
  const errors = useServerActionsStore((s) => s.errors)
  const metrics = useServerActionsStore((s) => s.metrics)

  const healthColor = deriveHealthColor(errors.length, metrics)
  const statusLabel = errors.length === 0
    ? 'All systems healthy'
    : `${errors.length} incident${errors.length !== 1 ? 's' : ''}`
  const metaParts = [
    uptime ? `Up ${uptime}` : null,
    errors.length > 0 ? `${errors.length} error${errors.length !== 1 ? 's' : ''}` : null,
  ].filter(Boolean)

  return (
    <Card style={styles.card} accentColor={colors.bracketAccent}>
      <CardTitle icon={<Activity size={16} color={colors.textSecondary} strokeWidth={2} />}>
        Server Health
      </CardTitle>
      <TouchableOpacity
        style={[styles.row, { backgroundColor: colors.backgroundSecondary }]}
        onPress={onViewHealth}
        activeOpacity={0.7}
      >
        <View style={styles.left}>
          <View style={[styles.dot, { backgroundColor: healthColor }]} />
          <View style={styles.textStack}>
            <Text style={[styles.label, { color: colors.text }]}>{statusLabel}</Text>
            {metaParts.length > 0 && (
              <Text style={[styles.meta, { color: colors.textSecondary }]}>
                {metaParts.join('  ·  ')}
              </Text>
            )}
          </View>
        </View>
        <ChevronRight size={16} color={colors.textTertiary} strokeWidth={2} />
      </TouchableOpacity>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    gap: spacing[3],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    flex: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  textStack: {
    gap: spacing[1],
    flex: 1,
  },
  label: {
    ...typeStyles.body,
  },
  meta: {
    ...typeStyles.bodySmall,
  },
})
