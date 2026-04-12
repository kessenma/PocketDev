import React from 'react'
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { FolderGit2, Ghost, GitBranch, RefreshCw, Shapes, Split } from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { borderRadius, palette, spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../../contexts/ThemeContext'
import { useAdaptiveLayout } from '../../../hooks/useAdaptiveLayout'
import { useGitStore } from '../../../stores/git'
import { useNewTaskDraftStore } from '../../../stores/new-task-draft'
import { useFilesStore } from '../../../stores/files'
import BauhausTooltip from '../../shared/BauhausTooltip'
import SplitViewLayout from '../../layout/SplitViewLayout'
import GitBranchList from '../../git/GitBranchList'
import GitChangeDetailSheet from '../../git/GitChangeDetailSheet'
import GitChangeList from '../../git/GitChangeList'
import GitCommitComposer from '../../git/GitCommitComposer'
import GitConflictPanel from '../../git/GitConflictPanel'
import GitDiffPreview from '../../git/GitDiffPreview'
import GitHistoryList from '../../git/GitHistoryList'
import GitPushPanel from '../../git/GitPushPanel'
import GitStashPanel from '../../git/GitStashPanel'
import GitStatusSummary from '../../git/GitStatusSummary'
import CodeScreenHeader from '../navigation/CodeScreenHeader'
import CodeSubTabNavigator from '../navigation/CodeSubTabNavigator'
import type { CodeScreenTabProps, CodeSubTabOption } from '../navigation/types'
import type { GitView } from '../../git/model'
import type { MainTabParamList } from '../../../navigation/types'

const VIEW_OPTIONS: readonly CodeSubTabOption<GitView>[] = [
  { value: 'changes', label: 'Changes', icon: Split },
  { value: 'history', label: 'History', icon: Ghost },
  { value: 'branches', label: 'Branches', icon: Shapes },
]

export default function GitTab({ onScroll, onOpenProjects }: CodeScreenTabProps) {
  const { colors } = useTheme()
  const { layoutMode } = useAdaptiveLayout()
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>()
  const [isChangeSheetVisible, setIsChangeSheetVisible] = React.useState(false)
  const repoName = useGitStore((state) => state.repoName)
  const repoPath = useGitStore((state) => state.repoPath)
  const activeView = useGitStore((state) => state.activeView)
  const selectedFileId = useGitStore((state) => state.selectedFileId)
  const commitMessage = useGitStore((state) => state.commitMessage)
  const changes = useGitStore((state) => state.changes)
  const commits = useGitStore((state) => state.commits)
  const branches = useGitStore((state) => state.branches)
  const remote = useGitStore((state) => state.remote)
  const stashes = useGitStore((state) => state.stashes)
  const mergeState = useGitStore((state) => state.mergeState)
  const lastActionMessage = useGitStore((state) => state.lastActionMessage)
  const isRefreshing = useGitStore((state) => state.isRefreshing)
  const isCommitting = useGitStore((state) => state.isCommitting)
  const isPushing = useGitStore((state) => state.isPushing)
  const taskCount = useGitStore((state) => state.taskCount)
  const isPulling = useGitStore((state) => state.isPulling)
  const isStashing = useGitStore((state) => state.isStashing)
  const isAborting = useGitStore((state) => state.isAborting)
  const selectView = useGitStore((state) => state.selectView)
  const selectFile = useGitStore((state) => state.selectFile)
  const selectBranch = useGitStore((state) => state.selectBranch)
  const updateCommitMessage = useGitStore((state) => state.updateCommitMessage)
  const refresh = useGitStore((state) => state.refresh)
  const commit = useGitStore((state) => state.commit)
  const push = useGitStore((state) => state.push)
  const pull = useGitStore((state) => state.pull)
  const stash = useGitStore((state) => state.stash)
  const popStash = useGitStore((state) => state.popStash)
  const applyStash = useGitStore((state) => state.applyStash)
  const dropStash = useGitStore((state) => state.dropStash)
  const abortMerge = useGitStore((state) => state.abortMerge)

  const setDraftPrompt = useNewTaskDraftStore((state) => state.setPrompt)
  const setDraftMode = useNewTaskDraftStore((state) => state.selectTaskMode)
  const toggleContextPath = useFilesStore((state) => state.toggleContextPath)

  const handleFixWithAI = React.useCallback(() => {
    if (!mergeState) return
    const fileList = mergeState.conflictedPaths.map((p: string) => `- ${p}`).join('\n')
    const branchLabel = mergeState.mergeBranch ? `\`${mergeState.mergeBranch}\`` : 'the remote branch'
    const prompt = [
      `I have a merge conflict between the current branch and ${branchLabel}.`,
      '',
      'Conflicted files:',
      fileList,
      '',
      'Before making any edits:',
      '1. Read each conflicted file and identify both sides of every conflict marker.',
      '2. Explain what each side contains and which version (or combination) you plan to keep and why.',
      '3. Wait for my approval before writing any changes.',
      '',
      'Once I confirm, resolve every conflict by removing all markers (<<<<<<< / ======= / >>>>>>>) and producing clean, working code.',
    ].join('\n')

    setDraftPrompt(prompt)
    setDraftMode('plan')
    for (const path of mergeState.conflictedPaths) {
      toggleContextPath(path)
    }
    navigation.navigate('Tasks')
  }, [mergeState, setDraftPrompt, setDraftMode, toggleContextPath, navigation])

  const scrollY = React.useRef(new Animated.Value(0)).current
  const currentBranch = branches.find((branch) => branch.current) ?? branches[0]
  const selectedFile = changes.find((change) => change.id === selectedFileId) ?? null
  const canCommit = commitMessage.trim().length > 0 && changes.length > 0 && !isCommitting
  const hasRepoContext = repoName.length > 0 || repoPath.length > 0 || branches.length > 0
  const bauhaus = palette.bauhaus
  const isSplitLayout = layoutMode === 'tabletSplit'

  const handleSelectFile = React.useCallback((fileId: string) => {
    selectFile(fileId)
    if (!isSplitLayout) {
      setIsChangeSheetVisible(true)
    }
  }, [isSplitLayout, selectFile])

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

  const repoHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [72, 0],
    extrapolate: 'clamp',
  })

  const repoOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  const controlCompact = scrollY.interpolate({
    inputRange: [60, 120],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })

  const headerPadV = scrollY.interpolate({
    inputRange: [60, 120],
    outputRange: [spacing[3], spacing[1]],
    extrapolate: 'clamp',
  })

  const headerGap = scrollY.interpolate({
    inputRange: [60, 120],
    outputRange: [spacing[2], 0],
    extrapolate: 'clamp',
  })

  const statusHeight = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [18, 0],
    extrapolate: 'clamp',
  })

  const conflictPanel = mergeState?.inProgress ? (
    <GitConflictPanel
      mergeState={mergeState}
      isAborting={isAborting}
      onAbort={abortMerge}
      onFixWithAI={handleFixWithAI}
    />
  ) : null

  const stashPanel = (
    <GitStashPanel
      stashes={stashes}
      changes={changes}
      isStashing={isStashing}
      onStash={stash}
      onPop={popStash}
      onApply={applyStash}
      onDrop={dropStash}
    />
  )

  const changesView = isSplitLayout
    ? (
      <SplitViewLayout
        leading={
          <View style={styles.stack}>
            <GitStatusSummary changes={changes} stashes={stashes} headFilesChanged={commits[0]?.filesChanged ?? 0} taskCount={taskCount} />
            <GitChangeList
              changes={changes}
              selectedFileId={selectedFileId}
              onSelect={handleSelectFile}
            />
            {conflictPanel}
            {stashPanel}
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
        <GitStatusSummary changes={changes} stashes={stashes} headFilesChanged={commits[0]?.filesChanged ?? 0} taskCount={taskCount} />
        <GitChangeList
          changes={changes}
          selectedFileId={selectedFileId}
          onSelect={handleSelectFile}
        />
        {conflictPanel}
        {stashPanel}
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
    <View style={styles.container}>
      <CodeScreenHeader style={{ paddingTop: headerPadV, paddingBottom: headerPadV, gap: headerGap }}>
        <Animated.View style={[styles.repoRow, { height: repoHeight, opacity: repoOpacity }]}>
          <View style={styles.repoInfo}>
            <Text style={[styles.repoName, { color: colors.text }]} numberOfLines={1}>
              {repoName || 'No repository'}
            </Text>
            <Text style={[styles.repoPath, { color: colors.textTertiary }]} numberOfLines={1}>
              {repoPath || 'Pick a repo to get started'}
            </Text>
          </View>
          <View style={styles.repoBadges}>
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
            <BauhausTooltip label={syncLabel} direction="bottom">
              <View style={[styles.syncDot, { backgroundColor: syncDotColor }]} />
            </BauhausTooltip>
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
          </View>
        </Animated.View>

        <View style={styles.controlRow}>
          <CodeSubTabNavigator
            value={activeView}
            options={VIEW_OPTIONS}
            onChange={selectView}
            compact={controlCompact}
          />
        </View>

        <Animated.View style={{ height: statusHeight, opacity: repoOpacity, overflow: 'hidden' }}>
          <Text style={[styles.statusMessage, { color: colors.textTertiary }]} numberOfLines={1}>
            {lastActionMessage}
          </Text>
        </Animated.View>
      </CodeScreenHeader>

      <Animated.ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: false,
            listener: onScroll as any,
          },
        )}
        scrollEventThrottle={16}
      >
        {!hasRepoContext && !isRefreshing ? (
          <View style={[styles.emptyBanner, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Open the repo picker from the server screen to choose a local repository or clone one from GitHub.
            </Text>
          </View>
        ) : null}
        {activeView === 'changes' ? changesView : null}
        {activeView === 'history' ? historyView : null}
        {activeView === 'branches' ? branchesView : null}
      </Animated.ScrollView>

      {!isSplitLayout ? (
        <GitChangeDetailSheet
          visible={isChangeSheetVisible}
          change={selectedFile}
          onClose={() => setIsChangeSheetVisible(false)}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing[3],
  },
  repoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    overflow: 'hidden',
  },
  repoInfo: {
    flex: 1,
    gap: 2,
  },
  repoName: {
    ...typographyScale.lg,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  repoPath: {
    ...typographyScale.xs,
    fontWeight: '500',
  },
  repoBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
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
    ...typographyScale.xs,
    fontWeight: '600',
  },
  syncDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButton: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusMessage: {
    ...typographyScale.xs,
    fontWeight: '500',
    paddingHorizontal: spacing[1],
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
    ...typographyScale.sm,
  },
  stack: {
    gap: spacing[4],
    flex: 1,
  },
})
