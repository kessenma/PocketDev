import React from 'react'
import { StyleSheet, View } from 'react-native'
import { spacing } from '@pocketdev/shared/theme'
import { useGitStore } from '../../../../stores/git'
import GitHistoryList from '../../../git/history/GitHistoryList'
import GitPushPanel from '../../../git/GitPushPanel'

export default function HistoryView() {
  const commits = useGitStore((s) => s.commits)
  const remote = useGitStore((s) => s.remote)
  const isPushing = useGitStore((s) => s.isPushing)
  const isPulling = useGitStore((s) => s.isPulling)
  const push = useGitStore((s) => s.push)
  const pull = useGitStore((s) => s.pull)

  return (
    <View style={styles.stack}>
      <GitHistoryList commits={commits} />
      <GitPushPanel remote={remote} isPushing={isPushing} isPulling={isPulling} onPushPress={push} onPullPress={pull} />
    </View>
  )
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing[4],
    flex: 1,
  },
})
