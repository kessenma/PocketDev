import React, { useCallback, useMemo, useState } from 'react'
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { FolderOpen, GitBranch, Terminal } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { CompositeNavigationProp } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import type { MainTabParamList, RootStackParamList } from '../../navigation/types'
import { useFilesStore } from '../../stores/files'
import { useGitStore } from '../../stores/git'
import { useProjectsStore } from '../../stores/projects'
import { useScriptsStore } from '../../stores/scripts'
import AdaptiveShell from '../layout/AdaptiveShell'
import RunningScriptsSheet from '../scripts/RunningScriptsSheet'
import SwipeablePager from '../shared/SwipeablePager'
import CodeBrowseTab from './code-browse/CodeBrowseTab'
import GitTab from './git/GitTab'
import ScriptsTab from './scripts/ScriptsTab'

type Props = {
  navigation: CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList, 'Code'>,
    NativeStackNavigationProp<RootStackParamList>
  >
}

export default function CodeScreenShell({ navigation }: Props) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const refreshFiles = useFilesStore((state) => state.refresh)
  const refreshGit = useGitStore((state) => state.refresh)
  const refreshProjects = useProjectsStore((state) => state.refresh)
  const [showRunningScripts, setShowRunningScripts] = useState(false)
  const scrollY = React.useRef(new Animated.Value(0)).current
  const runningCount = useScriptsStore((s) => {
    let count = 0
    for (const script of s.runningScripts.values()) {
      if (script.status === 'starting' || script.status === 'running') count++
    }
    return count
  })

  const codePages = useMemo(
    () => [
      { label: 'Files', title: 'Code Browser', icon: FolderOpen, accentColor: colors.accentBlue },
      { label: 'Git', title: 'Version Control', icon: GitBranch, accentColor: colors.accentRed },
      { label: 'Scripts', title: 'Scripts', icon: Terminal, accentColor: colors.accentYellow },
    ],
    [colors],
  )

  React.useEffect(() => {
    void Promise.allSettled([
      refreshProjects(),
      refreshFiles(),
      refreshGit(),
    ])
  }, [refreshFiles, refreshGit, refreshProjects])

  const onChildScroll = React.useMemo(
    () =>
      Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: false },
      ),
    [scrollY],
  )

  const handlePageChange = useCallback(() => {
    scrollY.setValue(0)
  }, [scrollY])

  return (
    <>
      <AdaptiveShell
        style={{ backgroundColor: colors.background, paddingTop: insets.top }}
        maxWidth={1360}
      >
        <View style={styles.container}>
          <SwipeablePager pages={codePages} scrollY={scrollY} onPageChange={handlePageChange}>
            <CodeBrowseTab onScroll={onChildScroll} />
            <GitTab onScroll={onChildScroll} onOpenProjects={() => navigation.navigate('Projects')} />
            <ScriptsTab onScroll={onChildScroll} />
          </SwipeablePager>
        </View>
      </AdaptiveShell>

      {runningCount > 0 ? (
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
      ) : null}

      <RunningScriptsSheet visible={showRunningScripts} onClose={() => setShowRunningScripts(false)} />
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
