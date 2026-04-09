import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { useAdaptiveLayout } from '../../hooks/useAdaptiveLayout'
import { useGitStore } from '../../stores/git'
import SplitViewLayout from '../layout/SplitViewLayout'
import GitBranchList from './GitBranchList'
import GitChangeList from './GitChangeList'
import GitCommitComposer from './GitCommitComposer'
import GitDiffPreview from './GitDiffPreview'
import GitHistoryList from './GitHistoryList'
import GitPushPanel from './GitPushPanel'
import GitRepoSummaryCard from './GitRepoSummaryCard'
import GitSegmentedControl from './GitSegmentedControl'
import GitStatusSummary from './GitStatusSummary'

const VIEW_OPTIONS = [
  { value: 'changes', label: 'Changes' },
  { value: 'history', label: 'History' },
  { value: 'branches', label: 'Branches' },
] as const

export default function GitWorkspace() {
  const { colors } = useTheme()
  const { layoutMode } = useAdaptiveLayout()
  const repoName = useGitStore((state) => state.repoName)
  const repoPath = useGitStore((state) => state.repoPath)
  const activeView = useGitStore((state) => state.activeView)
  const selectedFileId = useGitStore((state) => state.selectedFileId)
  const commitMessage = useGitStore((state) => state.commitMessage)
  const changes = useGitStore((state) => state.changes)
  const commits = useGitStore((state) => state.commits)
  const branches = useGitStore((state) => state.branches)
  const remote = useGitStore((state) => state.remote)
  const lastActionMessage = useGitStore((state) => state.lastActionMessage)
  const isRefreshing = useGitStore((state) => state.isRefreshing)
  const isCommitting = useGitStore((state) => state.isCommitting)
  const isPushing = useGitStore((state) => state.isPushing)
  const isPulling = useGitStore((state) => state.isPulling)
  const selectView = useGitStore((state) => state.selectView)
  const selectFile = useGitStore((state) => state.selectFile)
  const selectBranch = useGitStore((state) => state.selectBranch)
  const updateCommitMessage = useGitStore((state) => state.updateCommitMessage)
  const refresh = useGitStore((state) => state.refresh)
  const commit = useGitStore((state) => state.commit)
  const push = useGitStore((state) => state.push)
  const pull = useGitStore((state) => state.pull)

  const currentBranch = branches.find((branch) => branch.current) ?? branches[0]
  const selectedFile = changes.find((change) => change.id === selectedFileId) ?? null
  const canCommit = commitMessage.trim().length > 0 && changes.length > 0 && !isCommitting
  const hasRepoContext = repoName.length > 0 || repoPath.length > 0 || branches.length > 0

  const header = (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={[styles.eyebrow, { color: colors.textTertiary }]}>Git Prototype</Text>
        <Text style={[styles.title, { color: colors.text }]}>Phone-first git workspace</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          This feature uses local mock interactions today, but its actions are shaped around the existing terminal websocket path.
        </Text>
      </View>

      <View style={styles.controlRow}>
        <GitSegmentedControl
          value={activeView}
          options={VIEW_OPTIONS}
          onChange={selectView}
        />
        <Text
          accessibilityRole="button"
          onPress={refresh}
          style={[styles.refreshLink, { color: isRefreshing ? colors.textTertiary : colors.primary }]}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Text>
      </View>

      <View style={[styles.messageBanner, { backgroundColor: colors.backgroundSecondary }]}> 
        <Text style={[styles.messageText, { color: colors.textSecondary }]}>{lastActionMessage}</Text>
      </View>
    </View>
  )

  const changesView = layoutMode === 'tabletSplit'
    ? (
      <SplitViewLayout
        leading={
          <View style={styles.stack}>
            <GitStatusSummary changes={changes} />
            <GitChangeList
              changes={changes}
              selectedFileId={selectedFileId}
              onSelect={selectFile}
            />
          </View>
        }
        trailing={
          <View style={styles.stack}>
            <GitDiffPreview change={selectedFile} />
            <GitCommitComposer
              value={commitMessage}
              canCommit={canCommit}
              isCommitting={isCommitting}
              onChangeText={updateCommitMessage}
              onCommitPress={commit}
            />
            <GitPushPanel remote={remote} isPushing={isPushing} isPulling={isPulling} onPushPress={push} onPullPress={pull} />
          </View>
        }
        leadingWidth={380}
      />
    )
    : (
      <View style={styles.stack}>
        <GitStatusSummary changes={changes} />
        <GitChangeList
          changes={changes}
          selectedFileId={selectedFileId}
          onSelect={selectFile}
        />
        <GitDiffPreview change={selectedFile} />
        <GitCommitComposer
          value={commitMessage}
          canCommit={canCommit}
          isCommitting={isCommitting}
          onChangeText={updateCommitMessage}
          onCommitPress={commit}
        />
        <GitPushPanel remote={remote} isPushing={isPushing} isPulling={isPulling} onPushPress={push} onPullPress={pull} />
      </View>
    )

  const historyView = (
    <View style={styles.stack}>
      <GitHistoryList commits={commits} />
      <GitPushPanel remote={remote} isPushing={isPushing} isPulling={isPulling} onPushPress={push} onPullPress={pull} />
    </View>
  )

  const branchesView = (
    <View style={styles.stack}>
      <GitBranchList branches={branches} onSelectBranch={selectBranch} />
      <GitPushPanel remote={remote} isPushing={isPushing} isPulling={isPulling} onPushPress={push} onPullPress={pull} />
    </View>
  )

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {header}
      <GitRepoSummaryCard
        repoName={repoName}
        repoPath={repoPath}
        branch={currentBranch ?? null}
        remote={remote}
      />
      {!hasRepoContext && !isRefreshing ? (
        <View style={[styles.messageBanner, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.messageText, { color: colors.textSecondary }]}>
            Open the repo picker from the server screen to choose a local repository or clone one from GitHub.
          </Text>
        </View>
      ) : null}
      {activeView === 'changes' ? changesView : null}
      {activeView === 'history' ? historyView : null}
      {activeView === 'branches' ? branchesView : null}
    </ScrollView>
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
    gap: spacing[3],
  },
  headerText: {
    gap: spacing[1],
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
    maxWidth: 760,
  },
  controlRow: {
    gap: spacing[3],
  },
  refreshLink: {
    ...typographyScale.sm,
    fontWeight: '700',
    alignSelf: 'flex-start',
  },
  messageBanner: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  messageText: {
    ...typographyScale.sm,
  },
  stack: {
    gap: spacing[4],
    flex: 1,
  },
})
