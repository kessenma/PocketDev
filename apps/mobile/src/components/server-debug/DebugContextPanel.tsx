import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { spacing, borderRadius } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { useContainerStore } from '../../stores/containers'
import { useServerActionsStore } from '../../stores/server-actions'
import { Card, CardTitle } from '../ui/Card'
import Badge from '../ui/Badge'

import { typeStyles } from '../../theme/typography'
import { RefreshCw } from 'lucide-react-native'
import ModelSelector from '../model-selector/ModelSelector'
import type { ModelProvider, ModelProviderId } from '../model-selector/model'

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
  providers: ModelProvider[]
  selectedProviderId: ModelProviderId
  selectedModelId: string
  onSelectProvider: (providerId: ModelProviderId) => void
  onSelectModel: (providerId: ModelProviderId, modelId: string) => void
}

export default function DebugContextPanel({
  onRefresh,
  providers,
  selectedProviderId,
  selectedModelId,
  onSelectProvider,
  onSelectModel,
}: Props) {
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
        <Card style={styles.section} accentColor={colors.accentBlue}>
          <CardTitle>System</CardTitle>
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
        </Card>
      )}

      {/* Containers */}
      <Card style={styles.section} accentColor={colors.accentYellow}>
        <CardTitle>Containers</CardTitle>
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
                <Badge
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
      </Card>

      {/* Ports */}
      <Card style={styles.section} accentColor={colors.accentRed}>
        <CardTitle>Listening Ports</CardTitle>
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
              <Badge
                label={p.exposure}
                color={p.exposure === 'public' ? '#facc15' : '#22c55e'}
              />
            </View>
          ))
        )}
      </Card>

      {/* AI Model */}
      <Card style={styles.section} accentColor="#8b5cf6">
        <CardTitle>AI Model</CardTitle>
        <Text style={[typeStyles.bodySmall, { color: colors.textTertiary }]}>
          Used for AI Assist in the terminal.
        </Text>
        <ModelSelector
          providers={providers}
          selectedProviderId={selectedProviderId}
          selectedModelId={selectedModelId}
          onSelectProvider={onSelectProvider}
          onSelectModel={onSelectModel}
        />
      </Card>
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
