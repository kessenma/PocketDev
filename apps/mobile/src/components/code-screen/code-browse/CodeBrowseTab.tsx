import React, { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { FolderOpen, Pin, Waypoints } from 'lucide-react-native'
import { spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../../contexts/ThemeContext'
import { useFilesStore } from '../../../stores/files'
import { subscribeToGitEvents } from '../../../services/gitEventBus'
import ShrinkableHeader, { useShrinkableHeader } from '../../ui/ShrinkableHeader'
import CodeSubTabNavigator from '../navigation/CodeSubTabNavigator'
import EnvVarsTab from './env-vars/EnvVarsTab'
import BrowserView from './views/BrowserView'
import ContextView from './views/ContextView'
import type { CodeScreenTabProps, CodeSubTabOption } from '../navigation/types'

type BrowseView = 'browser' | 'env' | 'context'

const VIEW_OPTIONS: readonly CodeSubTabOption<BrowseView>[] = [
  { value: 'browser', label: 'Browser', icon: FolderOpen },
  { value: 'env', label: 'Env Vars', icon: Waypoints },
  { value: 'context', label: 'Context', icon: Pin },
]

export default function CodeBrowseTab({ onScroll }: CodeScreenTabProps) {
  const { isDark } = useTheme()
  const clearOfflineMode = useFilesStore((state) => state.clearOfflineMode)
  const [activeView, setActiveView] = useState<BrowseView>('browser')
  const [expanded, setExpanded] = useState(false)
  const { scrollY, scrollHandler } = useShrinkableHeader(onScroll)

  useEffect(() => {
    return subscribeToGitEvents((event) => {
      if (event.type === 'branch_switched') clearOfflineMode()
    })
  }, [clearOfflineMode])

  useEffect(() => {
    scrollY.value = 0
  }, [activeView, scrollY])

  useEffect(() => {
    if (!expanded) scrollY.value = 0
  }, [expanded, scrollY])

  const handleTabChange = (next: BrowseView) => {
    setActiveView(next)
    if (next !== 'browser') setExpanded(false)
  }

  return (
    <View style={styles.container}>
      {expanded ? (
        <View
          style={[
            styles.compactHeader,
            {
              backgroundColor: isDark ? 'rgba(14, 14, 14, 0.9)' : 'rgba(250, 248, 242, 0.96)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(26, 26, 26, 0.08)',
            },
          ]}
        >
          <CodeSubTabNavigator
            value={activeView}
            options={VIEW_OPTIONS}
            onChange={handleTabChange}
            variant="segmented"
          />
        </View>
      ) : (
        <ShrinkableHeader
          scrollY={scrollY}
          tabs={{ value: activeView, options: VIEW_OPTIONS, onChange: handleTabChange, variant: 'segmented' }}
        />
      )}
      {activeView === 'browser' && (
        <BrowserView
          scrollHandler={scrollHandler}
          expanded={expanded}
          onExpandChange={setExpanded}
        />
      )}
      {activeView === 'env' && <EnvVarsTab onScroll={onScroll} />}
      {activeView === 'context' && <ContextView scrollHandler={scrollHandler} />}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing[3],
  },
  compactHeader: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
})
