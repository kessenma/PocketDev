import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { spacing } from '@pocketdev/shared/theme'
import { useAdaptiveLayout } from '../../../../hooks/useAdaptiveLayout'
import { useGitStore } from '../../../../stores/git'
import { useNewTaskDraftStore } from '../../../../stores/new-task-draft'
import { useFilesStore } from '../../../../stores/files'
import SplitViewLayout from '../../../layout/SplitViewLayout'
import GitStatusSummary from '../../../git/changes/GitStatusSummary'
import GitChangeList from '../../../git/changes/GitChangeList'
import GitConflictPanel from '../../../git/changes/GitConflictPanel'
import GitStashPanel from '../../../git/changes/GitStashPanel'
import GitDiffPreview from '../../../git/changes/GitDiffPreview'
import GitCommitComposer from '../../../git/changes/GitCommitComposer'
import GitPushPanel from '../../../git/GitPushPanel'
import GitChangeDetailSheet from '../../../git/changes/GitChangeDetailSheet'
import type { MainTabParamList } from '../../../../navigation/types'

export default function ChangesView() {
  const { layoutMode } = useAdaptiveLayout()
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>()
  const [isChangeSheetVisible, setIsChangeSheetVisible] = React.useState(false)

  const changes = useGitStore((s) => s.changes)
  const commits = useGitStore((s) => s.commits)
  const selectedFileId = useGitStore((s) => s.selectedFileId)
  const commitMessage = useGitStore((s) => s.commitMessage)
  const remote = useGitStore((s) => s.remote)
  const stashes = useGitStore((s) => s.stashes)
  const mergeState = useGitStore((s) => s.mergeState)
  const taskCount = useGitStore((s) => s.taskCount)
  const isCommitting = useGitStore((s) => s.isCommitting)
  const isPushing = useGitStore((s) => s.isPushing)
  const isPulling = useGitStore((s) => s.isPulling)
  const isStashing = useGitStore((s) => s.isStashing)
  const isAborting = useGitStore((s) => s.isAborting)
  const selectFile = useGitStore((s) => s.selectFile)
  const updateCommitMessage = useGitStore((s) => s.updateCommitMessage)
  const commit = useGitStore((s) => s.commit)
  const push = useGitStore((s) => s.push)
  const pull = useGitStore((s) => s.pull)
  const stash = useGitStore((s) => s.stash)
  const popStash = useGitStore((s) => s.popStash)
  const applyStash = useGitStore((s) => s.applyStash)
  const dropStash = useGitStore((s) => s.dropStash)
  const abortMerge = useGitStore((s) => s.abortMerge)

  const setDraftPrompt = useNewTaskDraftStore((s) => s.setPrompt)
  const setDraftMode = useNewTaskDraftStore((s) => s.selectTaskMode)
  const toggleContextPath = useFilesStore((s) => s.toggleContextPath)

  const isSplitLayout = layoutMode === 'tabletSplit'
  const selectedFile = changes.find((c) => c.id === selectedFileId) ?? null
  const canCommit = commitMessage.trim().length > 0 && changes.length > 0 && !isCommitting

  const handleSelectFile = React.useCallback((fileId: string) => {
    selectFile(fileId)
    if (!isSplitLayout) {
      setIsChangeSheetVisible(true)
    }
  }, [isSplitLayout, selectFile])

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

  if (isSplitLayout) {
    return (
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
  }

  return (
    <>
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
      {isChangeSheetVisible && (
        <GitChangeDetailSheet
          change={selectedFile}
          onDismiss={() => setIsChangeSheetVisible(false)}
        />
      )}
    </>
  )
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing[4],
    flex: 1,
  },
})
