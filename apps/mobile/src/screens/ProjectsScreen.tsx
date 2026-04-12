import React, { useCallback, useMemo } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { borderRadius, spacing, type SemanticTheme } from '@pocketdev/shared/theme'
import type { ProjectSummary } from '@pocketdev/shared/types'
import { useTheme } from '../contexts/ThemeContext'
import AdaptiveShell from '../components/layout/AdaptiveShell'
import { useProjectsStore } from '../stores/projects'
import { useGitStore } from '../stores/git'
import { useOfflineStore } from '../stores/offline'
import { useConnectionStore } from '../stores/connection'
import ServerSegmentedControl from '../components/server-actions/ServerSegmentedControl'
import { Globe, Lock, type LucideIcon } from 'lucide-react-native'
import ProjectCloneCelebration from '../components/projects/ProjectCloneCelebration'
import BauhausButton from '../components/shared/BauhausButton'
import { BauhausPanel } from '../components/shared/BauhausPanel'
import BauhausBadge from '../components/shared/BauhausBadge'
import { typeStyles } from '../theme/typography'

type ProjectFilter = 'all' | 'local' | 'needsClone' | 'downloaded'
type VisibilityFilter = 'all' | 'public' | 'private'

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'local', label: 'On Device' },
  { value: 'needsClone', label: 'Needs Clone' },
  { value: 'downloaded', label: 'Downloaded' },
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
  const currentBranch = useGitStore((state) => state.currentBranch)
  const offlineSnapshots = useOfflineStore((state) => state.snapshots)
  const downloadingKey = useOfflineStore((state) => state.downloadingKey)
  const downloadProgress = useOfflineStore((state) => state.downloadProgress)
  const startDownload = useOfflineStore((state) => state.startDownload)
  const cancelDownload = useOfflineStore((state) => state.cancelDownload)
  const clearOfflineData = useOfflineStore((state) => state.clearOfflineData)
  const server = useConnectionStore((state) => state.server)
  const [branchDrafts, setBranchDrafts] = React.useState<Record<string, string>>({})
  const [filter, setFilter] = React.useState<ProjectFilter>('all')
  const [visibilityFilter, setVisibilityFilter] = React.useState<VisibilityFilter>('all')
  const [search, setSearch] = React.useState('')

  React.useEffect(() => {
    refresh()
  }, [refresh])

  const visibleProjects = React.useMemo(() => {
    const query = search.trim().toLowerCase()

    const filtered = projects.filter((project) => {
      if (filter === 'local') return project.isLocal
      if (filter === 'needsClone') return project.needsClone
      if (filter === 'downloaded') return Object.keys(offlineSnapshots).some((k) => k.startsWith(project.id + ':'))
      return true
    })

    const visibilityFiltered = filtered.filter((project) => {
      if (visibilityFilter === 'public') return project.visibility === 'public'
      if (visibilityFilter === 'private') return project.visibility === 'private'
      return true
    })

    const searched = query
      ? visibilityFiltered.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            (p.owner ?? '').toLowerCase().includes(query),
        )
      : visibilityFiltered

    return [...searched].sort((a, b) => {
      const aTime = a.lastUpdatedAt ? new Date(a.lastUpdatedAt).getTime() : 0
      const bTime = b.lastUpdatedAt ? new Date(b.lastUpdatedAt).getTime() : 0
      if (aTime !== bTime) return bTime - aTime
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }, [filter, projects, search, visibilityFilter])

  const extraData = useMemo(
    () => ({ branchDrafts, mutatingProjectId, mutatingAction, isMutating, cloneCelebrationProjectId, colors, offlineSnapshots, downloadingKey, downloadProgress }),
    [branchDrafts, mutatingProjectId, mutatingAction, isMutating, cloneCelebrationProjectId, colors, offlineSnapshots, downloadingKey, downloadProgress],
  )

  const renderItem = useCallback(({ item: project }: { item: ProjectSummary }) => {
    const branchDraft = branchDrafts[project.id] ?? ''
    const isProjectCloning = mutatingAction === 'clone' && mutatingProjectId === project.id
    const isProjectSelecting = mutatingAction === 'select' && mutatingProjectId === project.id
    const showCloneCelebration = cloneCelebrationProjectId === project.id
    const branchForDownload = project.isActive ? (currentBranch || (project.defaultBranch ?? '')) : (project.defaultBranch ?? '')
    const offlineKey = `${project.id}:${branchForDownload}`
    const offlineSnap = branchForDownload ? offlineSnapshots[offlineKey] : undefined
    const isThisDownloading = downloadingKey === offlineKey
    const isAnyDownloading = downloadingKey !== null

    return (
      <BauhausPanel
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
          <View style={styles.localSection}>
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

            {offlineSnap ? (
              <View style={styles.offlineBadgeRow}>
                <BauhausBadge
                  label={`Offline · ${offlineSnap.fileCount.toLocaleString()} files · ${branchForDownload}`}
                  color={colors.success}
                />
              </View>
            ) : null}

            {isThisDownloading && downloadProgress ? (
              <DownloadProgressBar progress={downloadProgress} colors={colors} />
            ) : null}

            {branchForDownload ? (
              <View style={styles.actionRow}>
                <View style={styles.actionButton}>
                  <BauhausButton
                    variant={offlineSnap ? 'secondary' : 'primary'}
                    loading={isThisDownloading}
                    disabled={isAnyDownloading && !isThisDownloading}
                    onPress={() => {
                      if (!server) return
                      void startDownload(project.id, branchForDownload, server.ip, server.port, project.localPath ?? '.')
                    }}
                  >
                    {offlineSnap ? 'Re-download' : 'Download for Offline'}
                  </BauhausButton>
                </View>
                {isThisDownloading ? (
                  <View style={styles.actionButton}>
                    <BauhausButton variant="secondary" onPress={cancelDownload}>
                      Cancel
                    </BauhausButton>
                  </View>
                ) : offlineSnap ? (
                  <View style={styles.actionButton}>
                    <BauhausButton
                      variant="danger"
                      onPress={() => void clearOfflineData(project.id, branchForDownload)}
                    >
                      Remove Offline
                    </BauhausButton>
                  </View>
                ) : null}
              </View>
            ) : null}
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
  }, [branchDrafts, setBranchDrafts, mutatingProjectId, mutatingAction, isMutating, cloneCelebrationProjectId, clearCloneCelebration, selectProject, cloneProject, colors, server, currentBranch, offlineSnapshots, downloadingKey, downloadProgress, startDownload, cancelDownload, clearOfflineData])

  const listHeader = (
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
      <TextInput
        style={[styles.searchInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.panelAlt }]}
        value={search}
        onChangeText={setSearch}
        placeholder="Search repositories..."
        placeholderTextColor={colors.textTertiary}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
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
  )

  const emptyState = !isLoading ? (
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
  ) : null

  return (
    <AdaptiveShell maxWidth={1240} style={{ backgroundColor: colors.background }}>
      <FlashList
        data={visibleProjects}
        renderItem={renderItem}
        keyExtractor={(project) => project.id}
        getItemType={(project) => project.isLocal ? 'local' : 'remote'}
        extraData={extraData}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={emptyState}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        style={styles.container}
        contentContainerStyle={styles.listContent}
      />
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

function DownloadProgressBar({
  progress,
  colors,
}: {
  progress: { fetched: number; total: number }
  colors: SemanticTheme
}) {
  const pct = progress.total > 0 ? Math.round((progress.fetched / progress.total) * 100) : 0
  return (
    <View style={progressStyles.track}>
      <View style={[progressStyles.fill, { width: `${pct}%` as any, backgroundColor: colors.primary }]} />
      <Text style={[progressStyles.label, { color: colors.textSecondary }]}>
        {pct}% · {progress.fetched.toLocaleString()} / {progress.total.toLocaleString()} files
      </Text>
    </View>
  )
}

const progressStyles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: borderRadius.full,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: borderRadius.full,
  },
  label: {
    ...typeStyles.meta,
    marginTop: spacing[1],
  },
})

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
  listContent: {
    paddingBottom: spacing[8],
  },
  separator: {
    height: spacing[4],
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
  localSection: {
    gap: spacing[3],
  },
  offlineBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  remoteSection: {
    gap: spacing[3],
  },
  searchInput: {
    ...typeStyles.body,
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
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
