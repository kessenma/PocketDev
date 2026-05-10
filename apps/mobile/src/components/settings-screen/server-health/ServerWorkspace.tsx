import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { spacing, borderRadius } from '@pocketdev/shared/theme'
import { useTheme } from '../../../contexts/ThemeContext'
import { typeStyles } from '../../../theme/typography'
import { useAdaptiveLayout } from '../../../hooks/useAdaptiveLayout'
import { useServerActionsStore } from '../../../stores/server-actions'
import SplitViewLayout from '../../layout/SplitViewLayout'
import ServerSegmentedControl from '../../server-actions/ServerSegmentedControl'
import ServerErrorListCard from './ServerErrorListCard'
import ServerHealthHero from './ServerHealthHero'
import ServerMetricGridCard from './ServerMetricGridCard'
import ServerNetworkListCard from './ServerNetworkListCard'
import ServerPortListCard from './ServerPortListCard'
import ServerQuickActionsCard from './ServerQuickActionsCard'

const VIEW_OPTIONS = [
  { value: 'overview', label: 'Overview' },
  { value: 'activity', label: 'Activity' },
  { value: 'errors', label: 'Errors' },
] as const

export default function ServerWorkspace() {
  const { colors } = useTheme()
  const { layoutMode } = useAdaptiveLayout()
  const serverLabel = useServerActionsStore((state) => state.serverLabel)
  const uptime = useServerActionsStore((state) => state.uptime)
  const activeView = useServerActionsStore((state) => state.activeView)
  const metrics = useServerActionsStore((state) => state.metrics)
  const ports = useServerActionsStore((state) => state.ports)
  const network = useServerActionsStore((state) => state.network)
  const errors = useServerActionsStore((state) => state.errors)
  const actions = useServerActionsStore((state) => state.actions)
  const lastActionMessage = useServerActionsStore((state) => state.lastActionMessage)
  const isRefreshing = useServerActionsStore((state) => state.isRefreshing)
  const selectView = useServerActionsStore((state) => state.selectView)
  const refresh = useServerActionsStore((state) => state.refresh)
  const previewAction = useServerActionsStore((state) => state.previewAction)

  const overviewView = layoutMode === 'tabletSplit'
    ? (
      <SplitViewLayout
        leading={
          <View style={styles.stack}>
            <ServerMetricGridCard metrics={metrics} />
            <ServerPortListCard ports={ports} />
          </View>
        }
        trailing={
          <View style={styles.stack}>
            <ServerQuickActionsCard actions={actions} onRunAction={previewAction} />
            <ServerErrorListCard errors={errors.slice(0, 2)} />
          </View>
        }
        leadingWidth={420}
      />
    )
    : (
      <View style={styles.stack}>
        <ServerMetricGridCard metrics={metrics} />
        <ServerPortListCard ports={ports} />
        <ServerQuickActionsCard actions={actions} onRunAction={previewAction} />
        <ServerErrorListCard errors={errors.slice(0, 2)} />
      </View>
    )

  const activityView = (
    <View style={styles.stack}>
      <ServerNetworkListCard entries={network} />
      <ServerPortListCard ports={ports} />
      <ServerQuickActionsCard actions={actions} onRunAction={previewAction} />
    </View>
  )

  const errorsView = (
    <View style={styles.stack}>
      <ServerErrorListCard errors={errors} />
      <ServerQuickActionsCard actions={actions} onRunAction={previewAction} />
    </View>
  )

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <ServerHealthHero
        serverLabel={serverLabel}
        uptime={uptime}
        incidentCount={errors.length}
        summary="Track workspace health, recent activity, and coding environment signals from one place."
      />

      <View style={styles.header}>
        <ServerSegmentedControl
          value={activeView}
          options={VIEW_OPTIONS}
          onChange={selectView}
        />
        <Text
          accessibilityRole="button"
          onPress={refresh}
          style={[styles.refreshLink, { color: isRefreshing ? colors.textTertiary : colors.primary }]}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Text>
      </View>

      <View style={[styles.messageBanner, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={[styles.messageText, { color: colors.textSecondary }]}>
          {lastActionMessage}
        </Text>
      </View>

      {activeView === 'overview' ? overviewView : null}
      {activeView === 'activity' ? activityView : null}
      {activeView === 'errors' ? errorsView : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    gap: spacing[4],
    paddingBottom: spacing[8],
  },
  header: {
    gap: spacing[3],
  },
  refreshLink: {
    ...typeStyles.bodySmall,
    alignSelf: 'flex-start',
  },
  messageBanner: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  messageText: {
    ...typeStyles.bodySmall,
  },
  stack: {
    gap: spacing[4],
    flex: 1,
  },
})
