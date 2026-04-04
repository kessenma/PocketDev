import React from 'react'
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useTheme } from '../contexts/ThemeContext'
import AdaptiveShell from '../components/layout/AdaptiveShell'
import ServerWorkspace from '../components/server-actions/ServerWorkspace'
import { useServerActionsStore } from '../stores/server-actions'
import { useGitStore } from '../stores/git'
import { GitWorkspace } from '../components/git'
import ServerSegmentedControl from '../components/server-actions/ServerSegmentedControl'
import { Assets } from '../../assets'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
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
  const { colors, isDark } = useTheme()
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

  const gitLogo = isDark ? Assets.githubWhite : Assets.githubBlack

  return (
    <AdaptiveShell style={{ backgroundColor: colors.background }} maxWidth={1360}>
      <View style={styles.container}>
        <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.heroHeader}>
            <Image source={gitLogo} style={styles.logo} resizeMode="contain" />
            <View style={styles.heroCopy}>
              <Text style={[styles.eyebrow, { color: colors.textTertiary }]}>Workspace</Text>
              <Text style={[styles.title, { color: colors.text }]}>Server and git control</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Switch between environment operations and repository work without leaving this screen.
              </Text>
            </View>
          </View>

          <ServerSegmentedControl
            value={activeView}
            options={VIEW_OPTIONS}
            onChange={setActiveView}
          />

          <TouchableOpacity
            style={[styles.manageButton, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
            onPress={() => navigation.getParent()?.navigate('Projects')}
            activeOpacity={0.7}
          >
            <Text style={[styles.manageButtonText, { color: colors.text }]}>Open Repo Picker</Text>
          </TouchableOpacity>
        </View>

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
  heroCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    gap: spacing[3],
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  logo: {
    width: 28,
    height: 28,
  },
  heroCopy: {
    flex: 1,
    gap: spacing[1],
  },
  eyebrow: {
    ...typographyScale.xs,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  title: {
    ...typographyScale.xl,
    fontWeight: '700',
  },
  subtitle: {
    ...typographyScale.sm,
  },
  manageButton: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  manageButtonText: {
    ...typographyScale.sm,
    fontWeight: '700',
  },
})
