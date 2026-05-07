import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { spacing } from '@pocketdev/shared/theme'
import { typeStyles } from '../../theme/typography'
import { useTheme } from '../../contexts/ThemeContext'
import GitBadge from './GitBadge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import type { GitBranchOption, GitRemoteState } from './model'

type Props = {
  repoName: string
  repoPath: string
  branch: GitBranchOption | null
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
    <Card>
      <CardHeader>
        <View style={styles.headerRow}>
          <View style={styles.titleBlock}>
            <CardTitle>{repoName || 'No repository selected'}</CardTitle>
            <CardDescription>{repoPath || 'Pick a repository to load git status.'}</CardDescription>
          </View>
          <GitBadge variant={branch?.protected ? 'primary' : 'outline'}>
            {branch?.name ?? 'No branch'}
          </GitBadge>
        </View>
      </CardHeader>

      <CardContent>
        <View style={styles.metricRow}>
          <View style={styles.metricCell}>
            <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>Upstream</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>{remote.upstream || 'Not connected'}</Text>
          </View>
          <View style={styles.metricCell}>
            <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>Last push</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>{remote.lastPushRelativeTime}</Text>
          </View>
        </View>

        <View style={[styles.syncBanner, { backgroundColor: colors.backgroundSecondary }]}> 
          <Text style={[styles.syncText, { color: colors.textSecondary }]}>{syncText}</Text>
        </View>
      </CardContent>
    </Card>
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
    ...typeStyles.sectionTitle,
  },
  metricValue: {
    ...typeStyles.button,
  },
  syncBanner: {
    borderRadius: 12,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  syncText: {
    ...typeStyles.bodySmall,
    fontWeight: '500',
  },
})
