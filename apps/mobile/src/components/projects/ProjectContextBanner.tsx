import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { ChevronRight, FolderGit2 } from 'lucide-react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { useProjectsStore } from '../../stores/projects'
import { typeStyles } from '../../theme/typography'

type Props = {
  onOpenProjects: () => void
}

export default function ProjectContextBanner({ onOpenProjects }: Props) {
  const { colors, isDark } = useTheme()
  const projects = useProjectsStore((state) => state.projects)
  const activeProject = projects.find((project) => project.isActive) ?? null

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onOpenProjects}
      style={[
        styles.banner,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(26,26,26,0.04)',
          borderColor: colors.border,
        },
      ]}
    >
      <FolderGit2 color={colors.textTertiary} size={18} strokeWidth={2} />
      <View style={styles.copy}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {activeProject?.name ?? 'No active repository'}
        </Text>
        <Text style={[styles.path, { color: colors.textTertiary }]} numberOfLines={1}>
          {activeProject?.localPath ?? 'Tap to choose a repo'}
        </Text>
      </View>
      <ChevronRight color={colors.textTertiary} size={16} strokeWidth={2.5} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  copy: {
    flex: 1,
    gap: 1,
  },
  name: {
    ...typeStyles.bodySmall,
  },
  path: {
    ...typeStyles.meta,
  },
})
