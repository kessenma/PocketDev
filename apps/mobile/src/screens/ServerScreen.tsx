import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from '../contexts/ThemeContext'
import AdaptiveShell from '../components/layout/AdaptiveShell'
import ServerWorkspace from '../components/server-actions/ServerWorkspace'
import { useServerActionsStore } from '../stores/server-actions'
import { useGitStore } from '../stores/git'
import { GitWorkspace } from '../components/git'
import ServerSegmentedControl from '../components/server-actions/ServerSegmentedControl'
import { spacing } from '@pocketdev/shared/theme'
import { useProjectsStore } from '../stores/projects'
import ProjectContextBanner from '../components/projects/ProjectContextBanner'
import type { CompositeNavigationProp } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { MainTabParamList, RootStackParamList } from '../navigation/types'

type Props = {
  navigation: CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList, 'Server'>,
    NativeStackNavigationProp<RootStackParamList>
  >
}

const VIEW_OPTIONS = [
  { value: 'operations', label: 'Operations' },
  { value: 'git', label: 'Git' },
] as const

export default function ServerScreen({ navigation }: Props) {
  const { colors } = useTheme()
  const refreshServer = useServerActionsStore((s) => s.refresh)
  const refreshGit = useGitStore((s) => s.refresh)
  const refreshProjects = useProjectsStore((s) => s.refresh)
  const [activeView, setActiveView] = React.useState<'operations' | 'git'>('operations')

  React.useEffect(() => {
    refreshProjects()
  }, [refreshProjects])

  React.useEffect(() => {
    if (activeView === 'operations') {
      refreshServer()
      return
    }
    refreshGit()
  }, [activeView, refreshGit, refreshServer])

  return (
    <AdaptiveShell style={{ backgroundColor: colors.background }} maxWidth={1360}>
      <View style={styles.container}>
        <ServerSegmentedControl
          value={activeView}
          options={VIEW_OPTIONS}
          onChange={setActiveView}
        />

        <ProjectContextBanner onOpenProjects={() => navigation.getParent()?.navigate('Projects')} />

        {activeView === 'operations' ? <ServerWorkspace /> : <GitWorkspace />}
      </View>
    </AdaptiveShell>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing[4],
  },
})
