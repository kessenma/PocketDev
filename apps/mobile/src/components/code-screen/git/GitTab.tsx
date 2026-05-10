import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import ReanimatedLib from 'react-native-reanimated'
import { FolderGit2, Ghost, GitBranch, RefreshCw, Shapes, Split } from 'lucide-react-native'
import { borderRadius, palette, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../../contexts/ThemeContext'
import { useGitStore } from '../../../stores/git'
import Tooltip from '../../ui/Tooltip'
import ShrinkableHeader, { useShrinkableHeader } from '../../ui/ShrinkableHeader'
import ChangesView from './views/ChangesView'
import HistoryView from './views/HistoryView'
import BranchesView from './views/BranchesView'
import type { CodeScreenTabProps, CodeSubTabOption } from '../navigation/types'
import type { GitView } from '../../git/model'
import { typeStyles } from '../../../theme/typography'

const VIEW_OPTIONS: readonly CodeSubTabOption<GitView>[] = [
  { value: 'changes', label: 'Changes', icon: Split },
  { value: 'history', label: 'History', icon: Ghost },
  { value: 'branches', label: 'Branches', icon: Shapes },
]

export default function GitTab({ onScroll, onOpenProjects }: CodeScreenTabProps) {
  const { colors } = useTheme()
  const repoName = useGitStore((state) => state.repoName)
  const repoPath = useGitStore((state) => state.repoPath)
  const activeView = useGitStore((state) => state.activeView)
  const branches = useGitStore((state) => state.branches)
  const remote = useGitStore((state) => state.remote)
  const lastActionMessage = useGitStore((state) => state.lastActionMessage)
  const isRefreshing = useGitStore((state) => state.isRefreshing)
  const selectView = useGitStore((state) => state.selectView)
  const refresh = useGitStore((state) => state.refresh)

  const { scrollY, scrollHandler } = useShrinkableHeader(onScroll)

  const currentBranch = branches.find((branch) => branch.current) ?? branches[0]
  const hasRepoContext = repoName.length > 0 || repoPath.length > 0 || branches.length > 0
  const bauhaus = palette.bauhaus

  const syncLabel =
    remote.ahead > 0
      ? `${remote.ahead} ahead`
      : remote.behind > 0
        ? `${remote.behind} behind`
        : 'synced'

  const syncDotColor =
    remote.ahead > 0
      ? bauhaus.yellow
      : remote.behind > 0
        ? bauhaus.blue
        : '#34C759'

  const repoAccessories = (
    <>
      {onOpenProjects ? (
        <TouchableOpacity
          onPress={onOpenProjects}
          activeOpacity={0.7}
          style={[styles.refreshButton, { borderColor: colors.border }]}
        >
          <FolderGit2 color={colors.primary} size={14} strokeWidth={2.5} />
        </TouchableOpacity>
      ) : null}
      {currentBranch ? (
        <View style={[styles.branchBadge, { backgroundColor: 'rgba(26,26,26,0.05)', borderColor: colors.border }]}>
          <GitBranch color={colors.textSecondary} size={12} strokeWidth={2.5} />
          <Text style={[styles.branchBadgeText, { color: colors.text }]} numberOfLines={1}>
            {currentBranch.name}
          </Text>
        </View>
      ) : null}
      <Tooltip label={syncLabel} direction="bottom">
        <View style={[styles.syncDot, { backgroundColor: syncDotColor }]} />
      </Tooltip>
      <TouchableOpacity
        onPress={refresh}
        activeOpacity={0.7}
        style={[styles.refreshButton, { borderColor: colors.border }]}
      >
        <RefreshCw
          color={isRefreshing ? colors.textTertiary : colors.primary}
          size={14}
          strokeWidth={2.5}
        />
      </TouchableOpacity>
    </>
  )

  return (
    <View style={styles.container}>
      <ShrinkableHeader
        scrollY={scrollY}
        title={repoName || 'No repository'}
        subtitle={repoPath || 'Pick a repo to get started'}
        accessories={repoAccessories}
        tabs={{ value: activeView, options: VIEW_OPTIONS, onChange: selectView, variant: 'segmented' }}
        statusLine={lastActionMessage}
      />

      <ReanimatedLib.ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {!hasRepoContext && !isRefreshing ? (
          <View style={[styles.emptyBanner, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Open the repo picker from the server screen to choose a local repository or clone one from GitHub.
            </Text>
          </View>
        ) : null}
        {activeView === 'changes' && <ChangesView />}
        {activeView === 'history' && <HistoryView />}
        {activeView === 'branches' && <BranchesView />}
      </ReanimatedLib.ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing[3],
  },
  branchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    maxWidth: 140,
  },
  branchBadgeText: {
    ...typeStyles.meta,
  },
  syncDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  refreshButton: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[8],
  },
  emptyBanner: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  emptyText: {
    ...typeStyles.bodySmall,
  },
})
