import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { spacing, typographyScale, borderRadius } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { useAdaptiveLayout } from '../../hooks/useAdaptiveLayout'
import { useContainerStore } from '../../stores/containers'
import SplitViewLayout from '../layout/SplitViewLayout'
import ContainerList from './ContainerList'
import ContainerLogsPanel from './ContainerLogsPanel'
import ContainerSegmentedControl from './ContainerSegmentedControl'
import ContainerStatusSummary from './ContainerStatusSummary'
import type { ContainerView } from './model'

const VIEW_OPTIONS = [
  { value: 'containers', label: 'Containers' },
  { value: 'logs', label: 'Logs' },
] as const

export default function ContainerWorkspace() {
  const { colors } = useTheme()
  const { layoutMode } = useAdaptiveLayout()
  const containers = useContainerStore((state) => state.containers)
  const selectedContainerId = useContainerStore((state) => state.selectedContainerId)
  const activeView = useContainerStore((state) => state.activeView)
  const lineCountInput = useContainerStore((state) => state.lineCountInput)
  const direction = useContainerStore((state) => state.direction)
  const filter = useContainerStore((state) => state.filter)
  const logsByContainer = useContainerStore((state) => state.logsByContainer)
  const isRefreshing = useContainerStore((state) => state.isRefreshing)
  const isLoadingLogs = useContainerStore((state) => state.isLoadingLogs)
  const isFollowingLogs = useContainerStore((state) => state.isFollowingLogs)
  const error = useContainerStore((state) => state.error)
  const lastActionMessage = useContainerStore((state) => state.lastActionMessage)
  const selectView = useContainerStore((state) => state.selectView)
  const selectContainer = useContainerStore((state) => state.selectContainer)
  const updateLineCountInput = useContainerStore((state) => state.updateLineCountInput)
  const setDirection = useContainerStore((state) => state.setDirection)
  const setFilter = useContainerStore((state) => state.setFilter)
  const refreshContainers = useContainerStore((state) => state.refreshContainers)
  const loadLogs = useContainerStore((state) => state.loadLogs)
  const startFollowingLogs = useContainerStore((state) => state.startFollowingLogs)
  const stopFollowingLogs = useContainerStore((state) => state.stopFollowingLogs)

  const selectedContainer = containers.find((container) => container.id === selectedContainerId) ?? null
  const logs = selectedContainerId ? logsByContainer[selectedContainerId] ?? [] : []

  function handleSelectContainer(containerId: string) {
    selectContainer(containerId)
    if (layoutMode !== 'tabletSplit') {
      selectView('logs')
    }
  }

  function handleToggleFollow() {
    if (isFollowingLogs) {
      stopFollowingLogs()
      return
    }

    startFollowingLogs()
  }

  const header = (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={[styles.eyebrow, { color: colors.textTertiary }]}>Docker Prototype</Text>
        <Text style={[styles.title, { color: colors.text }]}>Inspect server containers from mobile</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Docker-only v1 starts with docker ps -a, bounded log reads from the beginning or end, and live follow mode with an errors-only filter.
        </Text>
      </View>

      <View style={styles.controlRow}>
        <ContainerSegmentedControl
          value={activeView}
          options={VIEW_OPTIONS}
          onChange={(value) => selectView(value as ContainerView)}
        />
        <Text
          accessibilityRole="button"
          onPress={refreshContainers}
          style={[styles.refreshLink, { color: isRefreshing ? colors.textTertiary : colors.primary }]}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Text>
      </View>

      <View style={[styles.messageBanner, { backgroundColor: colors.backgroundSecondary }]}> 
        <Text style={[styles.messageText, { color: colors.textSecondary }]}>{lastActionMessage}</Text>
      </View>
    </View>
  )

  const listPane = (
    <View style={styles.stack}>
      <ContainerStatusSummary containers={containers} />
      <ContainerList
        containers={containers}
        selectedContainerId={selectedContainerId}
        onSelect={handleSelectContainer}
      />
    </View>
  )

  const logsPane = (
    <ContainerLogsPanel
      container={selectedContainer}
      lineCountInput={lineCountInput}
      direction={direction}
      filter={filter}
      logs={logs}
      isLoading={isLoadingLogs}
      isFollowing={isFollowingLogs}
      error={error}
      onLineCountChange={updateLineCountInput}
      onDirectionChange={setDirection}
      onFilterChange={setFilter}
      onRefreshLogs={loadLogs}
      onToggleFollow={handleToggleFollow}
    />
  )

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {header}
      {layoutMode === 'tabletSplit' ? (
        <SplitViewLayout leading={listPane} trailing={logsPane} leadingWidth={380} />
      ) : activeView === 'containers' ? (
        listPane
      ) : (
        logsPane
      )}
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
  headerText: {
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
  subtitle: {
    ...typographyScale.base,
    maxWidth: 760,
  },
  controlRow: {
    gap: spacing[3],
  },
  refreshLink: {
    ...typographyScale.sm,
    fontWeight: '700',
    alignSelf: 'flex-start',
  },
  messageBanner: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  messageText: {
    ...typographyScale.sm,
  },
  stack: {
    gap: spacing[4],
    flex: 1,
  },
})