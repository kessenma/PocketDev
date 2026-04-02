import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import GitBadge from './GitBadge'
import { GitCard, GitCardContent, GitCardDescription, GitCardHeader, GitCardTitle } from './GitCard'
import type { GitBranchOption, GitRemoteState } from './model'

type Props = {
  repoName: string
  repoPath: string
  branch: GitBranchOption
  remote: GitRemoteState
}

export default function GitRepoSummaryCard({ repoName, repoPath, branch, remote }: Props) {
  const { colors } = useTheme()
  const syncText =
    remote.ahead > 0
      ? `${remote.ahead} commits ready to push`
      : remote.behind > 0
        ? `${remote.behind} commits behind ${remote.remote}`
        : 'Working tree aligned with remote'

  return (
    <GitCard>
      <GitCardHeader>
        <View style={styles.headerRow}>
          <View style={styles.titleBlock}>
            <GitCardTitle>{repoName}</GitCardTitle>
            <GitCardDescription>{repoPath}</GitCardDescription>
          </View>
          <GitBadge variant={branch.protected ? 'primary' : 'outline'}>
            {branch.name}
          </GitBadge>
        </View>
      </GitCardHeader>

      <GitCardContent>
        <View style={styles.metricRow}>
          <View style={styles.metricCell}>
            <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>Upstream</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>{remote.upstream}</Text>
          </View>
          <View style={styles.metricCell}>
            <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>Last push</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>{remote.lastPushRelativeTime}</Text>
          </View>
        </View>

        <View style={[styles.syncBanner, { backgroundColor: colors.backgroundSecondary }]}> 
          <Text style={[styles.syncText, { color: colors.textSecondary }]}>{syncText}</Text>
        </View>
      </GitCardContent>
    </GitCard>
  )
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  titleBlock: {
    flex: 1,
    gap: spacing[1],
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  metricCell: {
    flex: 1,
    gap: spacing[1],
  },
  metricLabel: {
    ...typographyScale.xs,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  metricValue: {
    ...typographyScale.base,
    fontWeight: '600',
  },
  syncBanner: {
    borderRadius: 12,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  syncText: {
    ...typographyScale.sm,
    fontWeight: '500',
  },
})