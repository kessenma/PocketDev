import React from 'react'
import { StyleSheet, View } from 'react-native'
import type { CompositeNavigationProp } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useTheme } from '../contexts/ThemeContext'
import { FileWorkspace } from '../components/files'
import { GitWorkspace } from '../components/git'
import { ScriptsWorkspace } from '../components/scripts'
import AdaptiveShell from '../components/layout/AdaptiveShell'
import ProjectContextBanner from '../components/projects/ProjectContextBanner'
import ServerSegmentedControl from '../components/server-actions/ServerSegmentedControl'
import { useFilesStore } from '../stores/files'
import { useGitStore } from '../stores/git'
import { useProjectsStore } from '../stores/projects'
import { spacing } from '@pocketdev/shared/theme'
import type { MainTabParamList, RootStackParamList } from '../navigation/types'

type Props = {
  navigation: CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList, 'Code'>,
    NativeStackNavigationProp<RootStackParamList>
  >
}

const VIEW_OPTIONS = [
  { value: 'files', label: 'Files' },
  { value: 'git', label: 'Git' },
  { value: 'scripts', label: 'Scripts' },
] as const

export default function CodeScreen({ navigation }: Props) {
  const { colors } = useTheme()
  const refreshFiles = useFilesStore((state) => state.refresh)
  const refreshGit = useGitStore((state) => state.refresh)
  const refreshProjects = useProjectsStore((state) => state.refresh)
  const currentBranch = useGitStore((state) => state.branches.find((b) => b.current)?.name ?? 'No branch')
  const [activeView, setActiveView] = React.useState<'files' | 'git' | 'scripts'>('files')

  React.useEffect(() => {
    void Promise.allSettled([
      refreshProjects(),
      refreshFiles(),
      refreshGit(),
    ])
  }, [refreshFiles, refreshGit, refreshProjects])

  return (
    <AdaptiveShell style={{ backgroundColor: colors.background }} maxWidth={1360}>
      <View style={styles.container}>
        <ServerSegmentedControl
          value={activeView}
          options={VIEW_OPTIONS}
          onChange={setActiveView}
        />

        <ProjectContextBanner onOpenProjects={() => navigation.navigate('Projects')} />

        {activeView === 'files' ? (
          <FileWorkspace
            onOpenProjects={() => navigation.navigate('Projects')}
            currentBranch={currentBranch}
          />
        ) : activeView === 'git' ? (
          <GitWorkspace />
        ) : (
          <ScriptsWorkspace />
        )}
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
