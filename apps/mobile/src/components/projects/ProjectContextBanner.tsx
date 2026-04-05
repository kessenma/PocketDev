import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { useProjectsStore } from '../../stores/projects'
import { BauhausPanel } from '../shared/BauhausPanel'
import BauhausButton from '../shared/BauhausButton'
import { typeStyles } from '../../theme/typography'

type Props = {
  onOpenProjects: () => void
}

export default function ProjectContextBanner({ onOpenProjects }: Props) {
  const { colors } = useTheme()
  const projects = useProjectsStore((state) => state.projects)
  const activeProject = projects.find((project) => project.isActive) ?? null

  return (
    <BauhausPanel style={styles.banner} accentColor={colors.accentYellow}>
      <View style={styles.copy}>
        <Text style={[styles.eyebrow, { color: colors.textTertiary }]}>Active Repo</Text>
        <Text style={[styles.title, { color: colors.text }]}>
          {activeProject?.name ?? 'No active repository'}
        </Text>
        <Text style={[styles.path, { color: colors.textSecondary }]}>
          {activeProject?.localPath ?? 'Choose a local repo or clone one from GitHub.'}
        </Text>
      </View>

      <BauhausButton variant="secondary" onPress={onOpenProjects}>
        Open Repo Picker
      </BauhausButton>
    </BauhausPanel>
  )
}

const styles = StyleSheet.create({
  banner: {
    gap: spacing[3],
  },
  copy: {
    gap: spacing[1],
  },
  eyebrow: {
    ...typeStyles.sectionTitle,
  },
  title: {
    ...typeStyles.screenTitle,
  },
  path: {
    ...typeStyles.bodySmall,
  },
})
