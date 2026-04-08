import React, { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Terminal } from 'lucide-react-native'
import type { CompositeNavigationProp } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useTheme } from '../contexts/ThemeContext'
import { FileWorkspace } from '../components/files'
import { GitWorkspace } from '../components/git'
import { ScriptsWorkspace } from '../components/scripts'
import RunningScriptsSheet from '../components/scripts/RunningScriptsSheet'
import AdaptiveShell from '../components/layout/AdaptiveShell'
import ProjectContextBanner from '../components/projects/ProjectContextBanner'
import ServerSegmentedControl from '../components/server-actions/ServerSegmentedControl'
import { useFilesStore } from '../stores/files'
import { useGitStore } from '../stores/git'
import { useProjectsStore } from '../stores/projects'
import { useScriptsStore } from '../stores/scripts'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
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
  const [showRunningScripts, setShowRunningScripts] = useState(false)
  const runningCount = useScriptsStore((s) => {
    let count = 0
    for (const script of s.runningScripts.values()) {
      if (script.status === 'starting' || script.status === 'running') count++
    }
    return count
  })

  React.useEffect(() => {
    void Promise.allSettled([
      refreshProjects(),
      refreshFiles(),
      refreshGit(),
    ])
  }, [refreshFiles, refreshGit, refreshProjects])

  return (
    <>
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

      {runningCount > 0 && (
        <TouchableOpacity
          style={[styles.runningFab, { backgroundColor: colors.primary, borderColor: colors.border }]}
          onPress={() => setShowRunningScripts(true)}
          activeOpacity={0.7}
        >
          <Terminal color={colors.primaryText} size={20} strokeWidth={2.5} />
          <View style={[styles.runningBadge, { backgroundColor: '#22c55e' }]}>
            <Text style={styles.runningBadgeText}>{runningCount}</Text>
          </View>
        </TouchableOpacity>
      )}

      <RunningScriptsSheet visible={showRunningScripts} onClose={() => setShowRunningScripts(false)} />
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing[4],
  },
  runningFab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  runningBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  runningBadgeText: {
    ...typographyScale.xs,
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
  },
})
