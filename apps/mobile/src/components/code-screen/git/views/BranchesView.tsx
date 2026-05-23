import React from 'react'
import { StyleSheet, View } from 'react-native'
import { spacing } from '@pocketdev/shared/theme'
import { useGitStore } from '../../../../stores/git'
import GitBranchList from '../../../git/branches/GitBranchList'
import GitPushPanel from '../../../git/GitPushPanel'

export default function BranchesView() {
  const branches = useGitStore((s) => s.branches)
  const remote = useGitStore((s) => s.remote)
  const isPushing = useGitStore((s) => s.isPushing)
  const isPulling = useGitStore((s) => s.isPulling)
  const selectBranch = useGitStore((s) => s.selectBranch)
  const push = useGitStore((s) => s.push)
  const pull = useGitStore((s) => s.pull)

  return (
    <View style={styles.stack}>
      <GitBranchList branches={branches} onSelectBranch={selectBranch} />
      <GitPushPanel remote={remote} isPushing={isPushing} isPulling={isPulling} onPushPress={push} onPullPress={pull} />
    </View>
  )
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing[4],
    flex: 1,
    paddingBottom: spacing[24] * 3,
  },
})
