import React, { useState, useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { spacing } from '@pocketdev/shared/theme'
import { Layers, SquareTerminal } from 'lucide-react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { useAdaptiveLayout } from '../../hooks/useAdaptiveLayout'
import { useContainerStore } from '../../stores/containers'
import { useServerActionsStore } from '../../stores/server-actions'
import SwipeablePager from '../shared/SwipeablePager'
import type { PageMeta } from '../shared/PagerIndicator'
import SplitViewLayout from '../layout/SplitViewLayout'
import DebugProblemBanner from './DebugProblemBanner'
import DebugContextPanel from './DebugContextPanel'
import DebugTerminalPane from './DebugTerminalPane'

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

export default function ServerDebugWorkspace() {
  const { colors } = useTheme()
  const { layoutMode } = useAdaptiveLayout()
  const [problemDescription, setProblemDescription] = useState('')

  const refreshContainers = useContainerStore((s) => s.refreshContainers)
  const refreshServer = useServerActionsStore((s) => s.refresh)

  useEffect(() => {
    refreshContainers()
    refreshServer()
  }, [refreshContainers, refreshServer])

  function handleRefresh() {
    refreshContainers()
    refreshServer()
  }

  const isTabletSplit = layoutMode === 'tabletSplit'

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DebugProblemBanner value={problemDescription} onChange={setProblemDescription} />

      {isTabletSplit ? (
        <SplitViewLayout
          style={styles.split}
          leadingWidth={380}
          leading={<DebugContextPanel onRefresh={handleRefresh} />}
          trailing={<DebugTerminalPane problemDescription={problemDescription} />}
        />
      ) : (
        <View style={styles.pager}>
          <SwipeablePager pages={PAGES}>
            <DebugContextPanel onRefresh={handleRefresh} />
            <DebugTerminalPane problemDescription={problemDescription} />
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
