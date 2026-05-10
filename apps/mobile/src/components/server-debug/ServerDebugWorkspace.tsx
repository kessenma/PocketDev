import React, { useState, useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { spacing } from '@pocketdev/shared/theme'
import { Layers, SquareTerminal } from 'lucide-react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { useAdaptiveLayout } from '../../hooks/useAdaptiveLayout'
import { useContainerStore } from '../../stores/containers'
import { useServerActionsStore } from '../../stores/server-actions'
import { useConnectionStore } from '../../stores/connection'
import SwipeablePager from '../ui/SwipeablePager'
import type { PageMeta } from '../ui/PagerIndicator'
import SplitViewLayout from '../layout/SplitViewLayout'
import DebugProblemBanner from './DebugProblemBanner'
import DebugContextPanel from './DebugContextPanel'
import DebugTerminalPane from './DebugTerminalPane'
import { MODEL_PROVIDERS, mergeServerAvailability, getDefaultModelSelection } from '../model-selector/catalog'
import type { ModelProvider, ModelProviderId } from '../model-selector/model'
import { fetchCapabilities } from '../../services/api'

const PAGES: PageMeta[] = [
  {
    label: 'Context',
    title: 'Server Context',
    icon: Layers,
    accentColor: '#2d5fe5',
  },
  {
    label: 'Terminal',
    title: 'Interactive Terminal',
    icon: SquareTerminal,
    accentColor: '#22c55e',
  },
]

const defaultSelection = getDefaultModelSelection()

export default function ServerDebugWorkspace() {
  const { colors } = useTheme()
  const { layoutMode } = useAdaptiveLayout()
  const [problemDescription, setProblemDescription] = useState('')

  const [providers, setProviders] = useState<ModelProvider[]>(MODEL_PROVIDERS)
  const [selectedProviderId, setSelectedProviderId] = useState<ModelProviderId>(
    defaultSelection.selectedProviderId as ModelProviderId,
  )
  const [selectedModelId, setSelectedModelId] = useState<string>(defaultSelection.selectedModelId)

  const server = useConnectionStore((s) => s.server)
  const refreshContainers = useContainerStore((s) => s.refreshContainers)
  const refreshServer = useServerActionsStore((s) => s.refresh)

  useEffect(() => {
    refreshContainers()
    refreshServer()
  }, [refreshContainers, refreshServer])

  useEffect(() => {
    if (!server) return
    fetchCapabilities(server.ip, server.port)
      .then((caps) => setProviders(mergeServerAvailability(caps)))
      .catch(() => {})
  }, [server])

  function handleRefresh() {
    refreshContainers()
    refreshServer()
  }

  function handleSelectProvider(providerId: ModelProviderId) {
    setSelectedProviderId(providerId)
    const provider = providers.find((p) => p.id === providerId) ?? providers[0]
    setSelectedModelId(provider.models[0].id)
  }

  function handleSelectModel(providerId: ModelProviderId, modelId: string) {
    setSelectedProviderId(providerId)
    setSelectedModelId(modelId)
  }

  const isTabletSplit = layoutMode === 'tabletSplit'

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DebugProblemBanner value={problemDescription} onChange={setProblemDescription} />

      {isTabletSplit ? (
        <SplitViewLayout
          style={styles.split}
          leadingWidth={420}
          leading={
            <DebugContextPanel
              onRefresh={handleRefresh}
              providers={providers}
              selectedProviderId={selectedProviderId}
              selectedModelId={selectedModelId}
              onSelectProvider={handleSelectProvider}
              onSelectModel={handleSelectModel}
            />
          }
          trailing={
            <DebugTerminalPane
              problemDescription={problemDescription}
              selectedProviderId={selectedProviderId}
              selectedModelId={selectedModelId}
            />
          }
        />
      ) : (
        <View style={styles.pager}>
          <SwipeablePager pages={PAGES}>
            <DebugContextPanel
              onRefresh={handleRefresh}
              providers={providers}
              selectedProviderId={selectedProviderId}
              selectedModelId={selectedModelId}
              onSelectProvider={handleSelectProvider}
              onSelectModel={handleSelectModel}
            />
            <DebugTerminalPane
              problemDescription={problemDescription}
              selectedProviderId={selectedProviderId}
              selectedModelId={selectedModelId}
            />
          </SwipeablePager>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing[3],
    padding: spacing[4],
  },
  split: {
    flex: 1,
  },
  pager: {
    flex: 1,
  },
})
