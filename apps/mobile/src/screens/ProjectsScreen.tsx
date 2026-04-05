import React from 'react'
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../contexts/ThemeContext'
import AdaptiveShell from '../components/layout/AdaptiveShell'
import { useProjectsStore } from '../stores/projects'
import ServerSegmentedControl from '../components/server-actions/ServerSegmentedControl'
import { Globe, Lock, type LucideIcon } from 'lucide-react-native'
import ProjectCloneCelebration from '../components/projects/ProjectCloneCelebration'
import BauhausButton from '../components/shared/BauhausButton'
import { BauhausPanel } from '../components/shared/BauhausPanel'
import BauhausBadge from '../components/shared/BauhausBadge'
import { typeStyles } from '../theme/typography'

type ProjectFilter = 'all' | 'local' | 'needsClone'
type VisibilityFilter = 'all' | 'public' | 'private'

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'local', label: 'On Device' },
  { value: 'needsClone', label: 'Needs Clone' },
] as const

const VISIBILITY_FILTER_OPTIONS = [
  { value: 'all', label: 'Any Visibility' },
  { value: 'public', label: 'Public' },
  { value: 'private', label: 'Private' },
] as const

export default function ProjectsScreen() {
  const { colors } = useTheme()
  const projects = useProjectsStore((state) => state.projects)
  const githubUsername = useProjectsStore((state) => state.githubUsername)
  const refresh = useProjectsStore((state) => state.refresh)
  const selectProject = useProjectsStore((state) => state.selectProject)
  const cloneProject = useProjectsStore((state) => state.cloneProject)
  const isLoading = useProjectsStore((state) => state.isLoading)
  const isMutating = useProjectsStore((state) => state.isMutating)
  const mutatingProjectId = useProjectsStore((state) => state.mutatingProjectId)
  const mutatingAction = useProjectsStore((state) => state.mutatingAction)
  const cloneCelebrationProjectId = useProjectsStore((state) => state.cloneCelebrationProjectId)
  const clearCloneCelebration = useProjectsStore((state) => state.clearCloneCelebration)
  const lastActionMessage = useProjectsStore((state) => state.lastActionMessage)
  const [branchDrafts, setBranchDrafts] = React.useState<Record<string, string>>({})
  const [filter, setFilter] = React.useState<ProjectFilter>('all')
  const [visibilityFilter, setVisibilityFilter] = React.useState<VisibilityFilter>('all')

  React.useEffect(() => {
    refresh()
  }, [refresh])

  const visibleProjects = React.useMemo(() => {
    const filtered = projects.filter((project) => {
      if (filter === 'local') return project.isLocal
      if (filter === 'needsClone') return project.needsClone
      return true
    })

    const visibilityFiltered = filtered.filter((project) => {
      if (visibilityFilter === 'public') return project.visibility === 'public'
      if (visibilityFilter === 'private') return project.visibility === 'private'
      return true
    })

    return [...visibilityFiltered].sort((a, b) => {
      const aTime = a.lastUpdatedAt ? new Date(a.lastUpdatedAt).getTime() : 0
      const bTime = b.lastUpdatedAt ? new Date(b.lastUpdatedAt).getTime() : 0
      if (aTime !== bTime) return bTime - aTime
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }, [filter, projects, visibilityFilter])

  return (
    <AdaptiveShell maxWidth={1240} style={{ backgroundColor: colors.background }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: colors.textTertiary }]}>Repositories</Text>
          <Text style={[styles.title, { color: colors.text }]}>Pick what to work on</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Local repos are ready to open. GitHub repos stay metadata-only until you clone them.
          </Text>
          <Text style={[styles.helperText, { color: colors.textTertiary }]}>
            Sorted by most recent update by default.
          </Text>
          <View style={[styles.messageBanner, { backgroundColor: colors.panelAlt, borderColor: colors.border }]}>
            <Text style={[styles.messageText, { color: colors.textSecondary }]}>
              {githubUsername ? `GitHub profile: @${githubUsername}. ` : ''}
              {lastActionMessage}
            </Text>
          </View>
          <View style={styles.filterRow}>
            <ServerSegmentedControl value={filter} options={FILTER_OPTIONS} onChange={setFilter} />
            <ServerSegmentedControl
              value={visibilityFilter}
              options={VISIBILITY_FILTER_OPTIONS}
              onChange={setVisibilityFilter}
            />
            <Text style={[styles.countText, { color: colors.textSecondary }]}>
              {visibleProjects.length} shown
            </Text>
          </View>
        </View>

        {visibleProjects.map((project) => {
          const branchDraft = branchDrafts[project.id] ?? ''
          const isProjectCloning = mutatingAction === 'clone' && mutatingProjectId === project.id
          const isProjectSelecting = mutatingAction === 'select' && mutatingProjectId === project.id
          const showCloneCelebration = cloneCelebrationProjectId === project.id

          return (
            <BauhausPanel
              key={project.id}
              style={styles.card}
              accentColor={project.isActive ? colors.accentRed : project.isLocal ? colors.accentBlue : colors.accentYellow}
            >
              {showCloneCelebration ? (
                <ProjectCloneCelebration onComplete={clearCloneCelebration} />
              ) : null}
              <View style={styles.cardHeader}>
                <View style={styles.titleBlock}>
                  <Text style={[styles.repoName, { color: colors.text }]}>{project.name}</Text>
                  <Text style={[styles.repoMeta, { color: colors.textSecondary }]}>
                    {project.owner ? `${project.owner} · ` : ''}
                    {project.localPath ?? project.remoteUrl ?? 'No path available'}
                  </Text>
                  <Text style={[styles.updatedText, { color: colors.textTertiary }]}>
                    {formatLastUpdated(project.lastUpdatedAt)}
                  </Text>
                </View>
                <View style={styles.badges}>
                  {project.isActive ? <Badge label="Active" color={colors.primary} /> : null}
                  <Badge
                    label={project.isLocal ? 'Local' : 'GitHub'}
                    color={project.isLocal ? colors.accentBlue : colors.accentYellow}
                  />
                  {project.visibility === 'private' ? (
                    <Badge label="Private" color={colors.accentRed} icon={Lock} />
                  ) : project.visibility === 'public' ? (
                    <Badge label="Public" color={colors.accentBlue} icon={Globe} />
                  ) : null}
                </View>
              </View>

              {project.isLocal ? (
                <View style={styles.actionRow}>
                  <View style={styles.actionButton}>
                    <BauhausButton
                      loading={isProjectSelecting}
                      onPress={() => selectProject(project.id, false)}
                      disabled={isMutating}
                    >
                      Open
                    </BauhausButton>
                  </View>
                  <View style={styles.actionButton}>
                    <BauhausButton
                      variant="secondary"
                      loading={isProjectSelecting}
                      onPress={() => selectProject(project.id, true)}
                      disabled={isMutating}
                    >
                      Pull + Open
                    </BauhausButton>
                  </View>
                </View>
              ) : (
                <View style={styles.remoteSection}>
                  <View style={styles.actionRow}>
                    <View style={styles.actionButton}>
                      <BauhausButton
                        loading={isProjectCloning}
                        onPress={() => cloneProject(project.id, 'default')}
                        disabled={isMutating}
                      >
                        Clone Default
                      </BauhausButton>
                    </View>
                  </View>

                  <TextInput
                    style={[
                      styles.branchInput,
                      { borderColor: colors.border, color: colors.text, backgroundColor: colors.panelAlt },
                    ]}
                    value={branchDraft}
                    onChangeText={(value) => setBranchDrafts((state) => ({ ...state, [project.id]: value }))}
                    placeholder="New branch name"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="none"
                  />
                  <View style={styles.actionButton}>
                    <BauhausButton
                      variant="secondary"
                      loading={isProjectCloning}
                      onPress={() => cloneProject(project.id, 'new', branchDraft)}
                      disabled={isMutating || branchDraft.trim().length === 0}
                    >
                      Clone + New Branch
                    </BauhausButton>
                  </View>
                </View>
              )}
            </BauhausPanel>
          )
        })}

        {!isLoading && visibleProjects.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.panel, borderColor: colors.border }]}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No repositories found</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {filter === 'local'
                ? 'No local repos match this filter yet.'
                : filter === 'needsClone'
                  ? 'Everything in the current list is already available on device.'
                  : visibilityFilter === 'private'
                    ? 'No private repos matched the current filters.'
                    : visibilityFilter === 'public'
                      ? 'No public repos matched the current filters.'
                      : 'Connect GitHub in workspace setup or register a local repo from the paired server seed path.'}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </AdaptiveShell>
  )
}

function Badge({
  label,
  color,
  icon: Icon,
}: {
  label: string
  color: string
  icon?: LucideIcon
}) {
  return (
    <View style={styles.badgeRow}>
      {Icon ? <Icon color={color} size={12} strokeWidth={2.2} /> : null}
      <BauhausBadge label={label} color={color} />
    </View>
  )
}

function formatLastUpdated(value: string | null): string {
  if (!value) return 'Updated date unavailable'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Updated date unavailable'

  const diff = Date.now() - date.getTime()
  if (diff < 60_000) return 'Updated just now'
  if (diff < 3_600_000) return `Updated ${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `Updated ${Math.floor(diff / 3_600_000)}h ago`
  if (diff < 604_800_000) return `Updated ${Math.floor(diff / 86_400_000)}d ago`
  return `Updated ${date.toLocaleDateString()}`
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
    ...typeStyles.sectionTitle,
  },
  title: {
    ...typeStyles.display,
  },
  subtitle: {
    ...typeStyles.body,
  },
  helperText: {
    ...typeStyles.bodySmall,
  },
  messageBanner: {
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  messageText: {
    ...typeStyles.bodySmall,
  },
  filterRow: {
    gap: spacing[2],
  },
  countText: {
    ...typeStyles.meta,
  },
  card: {
    gap: spacing[3],
  },
  cardHeader: {
    gap: spacing[2],
  },
  titleBlock: {
    gap: spacing[1],
  },
  repoName: {
    ...typeStyles.screenTitle,
  },
  repoMeta: {
    ...typeStyles.bodySmall,
  },
  updatedText: {
    ...typeStyles.meta,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing[3],
    flexWrap: 'wrap',
  },
  actionButton: {
    minWidth: 160,
  },
  remoteSection: {
    gap: spacing[3],
  },
  branchInput: {
    ...typeStyles.body,
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  emptyState: {
    borderWidth: 2,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    gap: spacing[2],
  },
  emptyTitle: {
    ...typeStyles.screenTitle,
  },
  emptyText: {
    ...typeStyles.body,
  },
})
