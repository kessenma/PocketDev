import React from 'react'
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../contexts/ThemeContext'
import AdaptiveShell from '../components/layout/AdaptiveShell'
import { useProjectsStore } from '../stores/projects'

export default function ProjectsScreen() {
  const { colors } = useTheme()
  const projects = useProjectsStore((state) => state.projects)
  const githubUsername = useProjectsStore((state) => state.githubUsername)
  const refresh = useProjectsStore((state) => state.refresh)
  const selectProject = useProjectsStore((state) => state.selectProject)
  const cloneProject = useProjectsStore((state) => state.cloneProject)
  const isLoading = useProjectsStore((state) => state.isLoading)
  const isMutating = useProjectsStore((state) => state.isMutating)
  const lastActionMessage = useProjectsStore((state) => state.lastActionMessage)
  const [branchDrafts, setBranchDrafts] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <AdaptiveShell maxWidth={1240} style={{ backgroundColor: colors.background }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: colors.textTertiary }]}>Repositories</Text>
          <Text style={[styles.title, { color: colors.text }]}>Pick what to work on</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Local repos are ready to open. GitHub repos stay metadata-only until you clone them.
          </Text>
          <View style={[styles.messageBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.messageText, { color: colors.textSecondary }]}>
              {githubUsername ? `GitHub profile: @${githubUsername}. ` : ''}{lastActionMessage}
            </Text>
          </View>
        </View>

        {projects.map((project) => {
          const branchDraft = branchDrafts[project.id] ?? ''
          return (
            <View
              key={project.id}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: project.isActive ? colors.primary : colors.border }]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.titleBlock}>
                  <Text style={[styles.repoName, { color: colors.text }]}>{project.name}</Text>
                  <Text style={[styles.repoMeta, { color: colors.textSecondary }]}>
                    {project.owner ? `${project.owner} · ` : ''}
                    {project.localPath ?? project.remoteUrl ?? 'No path available'}
                  </Text>
                </View>
                <View style={styles.badges}>
                  {project.isActive ? <Badge label="Active" color={colors.primary} /> : null}
                  <Badge label={project.isLocal ? 'Local' : 'GitHub'} color={project.isLocal ? '#16a34a' : '#2563eb'} />
                </View>
              </View>

              {project.isLocal ? (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.primary }]}
                    onPress={() => selectProject(project.id, false)}
                    disabled={isMutating}
                  >
                    <Text style={[styles.actionText, { color: colors.primaryText }]}>Open</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.secondaryButton, { borderColor: colors.border }]}
                    onPress={() => selectProject(project.id, true)}
                    disabled={isMutating}
                  >
                    <Text style={[styles.secondaryText, { color: colors.text }]}>Pull + Open</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.remoteSection}>
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.primary }]}
                      onPress={() => cloneProject(project.id, 'default')}
                      disabled={isMutating}
                    >
                      <Text style={[styles.actionText, { color: colors.primaryText }]}>Clone Default</Text>
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    style={[styles.branchInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                    value={branchDraft}
                    onChangeText={(value) => setBranchDrafts((state) => ({ ...state, [project.id]: value }))}
                    placeholder="New branch name"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={[styles.secondaryButton, { borderColor: colors.border }]}
                    onPress={() => cloneProject(project.id, 'new', branchDraft)}
                    disabled={isMutating || branchDraft.trim().length === 0}
                  >
                    <Text style={[styles.secondaryText, { color: colors.text }]}>Clone + New Branch</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )
        })}

        {!isLoading && projects.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No repositories found</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Connect GitHub in workspace setup or register a local repo from the paired server seed path.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </AdaptiveShell>
  )
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.badge, { borderColor: color, backgroundColor: color + '14' }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    gap: spacing[4],
    paddingBottom: spacing[8],
  },
  header: {
    gap: spacing[2],
  },
  eyebrow: {
    ...typographyScale.xs,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  title: {
    ...typographyScale['2xl'],
    fontWeight: '700',
  },
  subtitle: {
    ...typographyScale.base,
  },
  messageBanner: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  messageText: {
    ...typographyScale.sm,
  },
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    gap: spacing[3],
  },
  cardHeader: {
    gap: spacing[2],
  },
  titleBlock: {
    gap: spacing[1],
  },
  repoName: {
    ...typographyScale.lg,
    fontWeight: '700',
  },
  repoMeta: {
    ...typographyScale.sm,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  badge: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  badgeText: {
    ...typographyScale.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing[3],
    flexWrap: 'wrap',
  },
  actionButton: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  actionText: {
    ...typographyScale.sm,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  secondaryText: {
    ...typographyScale.sm,
    fontWeight: '700',
  },
  remoteSection: {
    gap: spacing[3],
  },
  branchInput: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    gap: spacing[2],
  },
  emptyTitle: {
    ...typographyScale.lg,
    fontWeight: '700',
  },
  emptyText: {
    ...typographyScale.base,
  },
})
