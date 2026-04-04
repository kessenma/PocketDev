import React from 'react'
import { StyleSheet, View } from 'react-native'
import type { CompositeNavigationProp } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useTheme } from '../contexts/ThemeContext'
import { FileWorkspace } from '../components/files'
import AdaptiveShell from '../components/layout/AdaptiveShell'
import { useFilesStore } from '../stores/files'
import { useGitStore } from '../stores/git'
import { useProjectsStore } from '../stores/projects'
import type { MainTabParamList, RootStackParamList } from '../navigation/types'

type Props = {
  navigation: CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList, 'Files'>,
    NativeStackNavigationProp<RootStackParamList>
  >
}

export default function FilesScreen({ navigation }: Props) {
  const { colors } = useTheme()
  const refresh = useFilesStore((state) => state.refresh)
  const refreshGit = useGitStore((state) => state.refresh)
  const refreshProjects = useProjectsStore((state) => state.refresh)

  React.useEffect(() => {
    void Promise.allSettled([
      refreshProjects(),
      refresh(),
      refreshGit(),
    ])
  }, [refresh, refreshGit, refreshProjects])

  return (
    <AdaptiveShell style={{ backgroundColor: colors.background }} maxWidth={1360}>
      <View style={styles.container}>
        <FileWorkspace onOpenProjects={() => navigation.navigate('Projects')} />
      </View>
    </AdaptiveShell>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})
