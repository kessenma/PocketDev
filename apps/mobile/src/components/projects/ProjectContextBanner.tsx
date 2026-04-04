import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { useProjectsStore } from '../../stores/projects'

type Props = {
  onOpenProjects: () => void
}

export default function ProjectContextBanner({ onOpenProjects }: Props) {
  const { colors } = useTheme()
  const projects = useProjectsStore((state) => state.projects)
  const activeProject = projects.find((project) => project.isActive) ?? null

  return (
    <View style={[styles.banner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.copy}>
        <Text style={[styles.eyebrow, { color: colors.textTertiary }]}>Active Repo</Text>
        <Text style={[styles.title, { color: colors.text }]}>
          {activeProject?.name ?? 'No active repository'}
        </Text>
        <Text style={[styles.path, { color: colors.textSecondary }]}>
          {activeProject?.localPath ?? 'Choose a local repo or clone one from GitHub.'}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary + '14', borderColor: colors.primary + '35' }]}
        onPress={onOpenProjects}
        activeOpacity={0.7}
      >
        <Text style={[styles.buttonText, { color: colors.primary }]}>Manage Repos</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    gap: spacing[3],
  },
  copy: {
    gap: spacing[1],
  },
  eyebrow: {
    ...typographyScale.xs,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  title: {
    ...typographyScale.lg,
    fontWeight: '700',
  },
  path: {
    ...typographyScale.sm,
  },
  button: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  buttonText: {
    ...typographyScale.sm,
    fontWeight: '700',
  },
})
