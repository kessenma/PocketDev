import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { spacing, borderRadius } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { useContainerStore } from '../../stores/containers'
import { useServerActionsStore } from '../../stores/server-actions'
import { BauhausPanel } from '../shared/BauhausPanel'
import BauhausBadge from '../shared/BauhausBadge'
import BauhausButton from '../shared/BauhausButton'
import { typeStyles } from '../../theme/typography'
import { RefreshCw } from 'lucide-react-native'

const METRIC_TONE_COLORS: Record<string, string> = {
  healthy: '#22c55e',
  warning: '#facc15',
  critical: '#ef4444',
  neutral: '#94a3b8',
}

const CONTAINER_STATE_COLORS: Record<string, string> = {
  running: '#22c55e',
  exited: '#ef4444',
  restarting: '#facc15',
  paused: '#94a3b8',
  dead: '#ef4444',
  created: '#94a3b8',
  removing: '#facc15',
  unknown: '#94a3b8',
}

interface Props {
  onRefresh: () => void
}

export default function DebugContextPanel({ onRefresh }: Props) {
  const { colors } = useTheme()

  const containers = useContainerStore((s) => s.containers)
  const isRefreshingContainers = useContainerStore((s) => s.isRefreshing)

  const metrics = useServerActionsStore((s) => s.metrics)
  const ports = useServerActionsStore((s) => s.ports)
  const uptime = useServerActionsStore((s) => s.uptime)
  const isRefreshingServer = useServerActionsStore((s) => s.isRefreshing)

  const isRefreshing = isRefreshingContainers || isRefreshingServer

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Refresh */}
      <View style={styles.refreshRow}>
        <Text style={[typeStyles.meta, { color: colors.textTertiary }]}>
          {uptime ? `Uptime: ${uptime}` : 'Not yet loaded'}
        </Text>
        <TouchableOpacity onPress={onRefresh} disabled={isRefreshing} activeOpacity={0.7}>
          {isRefreshing
            ? <ActivityIndicator size="small" color={colors.textTertiary} />
            : <RefreshCw size={16} color={colors.textTertiary} strokeWidth={2.2} />
          }
        </TouchableOpacity>
      </View>

      {/* Metrics */}
      {metrics.length > 0 && (
        <BauhausPanel style={styles.section} accentColor={colors.accentBlue}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>System</Text>
          {metrics.map((m) => (
            <View key={m.id} style={styles.row}>
              <Text style={[typeStyles.bodySmall, { color: colors.textSecondary }]}>{m.label}</Text>
              <View style={styles.metricRight}>
                <Text style={[typeStyles.bodyStrong, { color: colors.text }]}>{m.value}</Text>
                {m.detail ? (
                  <Text style={[typeStyles.meta, { color: METRIC_TONE_COLORS[m.tone] ?? colors.textTertiary }]}>
                    {m.detail}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </BauhausPanel>
      )}

      {/* Containers */}
      <BauhausPanel style={styles.section} accentColor={colors.accentYellow}>
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Containers</Text>
        {containers.length === 0 ? (
          <Text style={[typeStyles.bodySmall, { color: colors.textTertiary }]}>
            {isRefreshingContainers ? 'Loading...' : 'No containers found'}
          </Text>
        ) : (
          containers.map((c) => (
            <View key={c.id} style={styles.containerRow}>
              <View style={styles.containerLeft}>
                <Text style={[typeStyles.bodyStrong, { color: colors.text }]} numberOfLines={1}>
                  {c.name}
                </Text>
                <Text style={[typeStyles.meta, { color: colors.textTertiary }]} numberOfLines={1}>
                  {c.image}
                </Text>
              </View>
              <View style={styles.containerRight}>
                <BauhausBadge
                  label={c.state}
                  color={CONTAINER_STATE_COLORS[c.state] ?? '#94a3b8'}
                />
                {c.ports.length > 0 && (
                  <Text style={[typeStyles.meta, { color: colors.textTertiary }]} numberOfLines={1}>
                    {c.ports.slice(0, 2).join(', ')}
                  </Text>
                )}
              </View>
            </View>
          ))
        )}
      </BauhausPanel>

      {/* Ports */}
      <BauhausPanel style={styles.section} accentColor={colors.accentRed}>
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Listening Ports</Text>
        {ports.length === 0 ? (
          <Text style={[typeStyles.bodySmall, { color: colors.textTertiary }]}>
            {isRefreshingServer ? 'Loading...' : 'No port data'}
          </Text>
        ) : (
          ports.slice(0, 20).map((p) => (
            <View key={p.id} style={styles.row}>
              <View style={styles.portLeft}>
                <Text style={[typeStyles.bodyStrong, { color: colors.text }]}>
                  :{p.port}
                </Text>
                <Text style={[typeStyles.meta, { color: colors.textTertiary }]}>
                  {p.service || p.process}
                </Text>
              </View>
              <BauhausBadge
                label={p.exposure}
                color={p.exposure === 'public' ? '#facc15' : '#22c55e'}
              />
            </View>
          ))
        )}
      </BauhausPanel>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    gap: spacing[3],
    paddingBottom: spacing[6],
  },
  refreshRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[1],
  },
  section: {
    gap: spacing[2],
  },
  sectionTitle: {
    ...typeStyles.sectionTitle,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[2],
  },
  metricRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  containerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing[2],
  },
  containerLeft: {
    flex: 1,
    gap: 2,
  },
  containerRight: {
    alignItems: 'flex-end',
    gap: spacing[1],
  },
  portLeft: {
    gap: 2,
  },
})
