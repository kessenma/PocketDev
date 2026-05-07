import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { typeStyles } from '../../theme/typography'
import type { GitStashEntry } from '@pocketdev/shared/types'
import { useTheme } from '../../contexts/ThemeContext'
import BauhausTooltip from '../shared/BauhausTooltip'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import type { GitFileChange } from './model'

type Props = {
  changes: GitFileChange[]
  stashes: GitStashEntry[]
  headFilesChanged: number
  taskCount: number
}

export default function GitStatusSummary({ changes, stashes, headFilesChanged, taskCount }: Props) {
  const { colors } = useTheme()

  const stagedCount = changes.filter((c) => c.staged).length
  const newFiles = changes.filter((c) => c.kind === 'added' && !c.staged)
  const newCount = newFiles.length

  const metrics = [
    {
      label: 'Staged',
      value: stagedCount,
      tone: colors.primary,
      tooltip: stagedCount === 1 ? '1 file staged and ready to commit.' : `${stagedCount} files staged and ready to commit.`,
      items: undefined as string[] | undefined,
    },
    {
      label: 'Commit',
      value: headFilesChanged,
      tone: colors.warning,
      tooltip: headFilesChanged === 1 ? '1 file changed in the last commit.' : `${headFilesChanged} files changed in the last commit.`,
      items: undefined as string[] | undefined,
    },
    {
      label: 'New Files',
      value: newCount,
      tone: colors.success,
      tooltip: newCount === 0
        ? 'No untracked new files.'
        : newCount === 1 ? '1 untracked file:' : `${newCount} untracked files:`,
      items: newFiles.map((c) => {
        const parts = c.path.split('/')
        return parts.length > 1 ? `${parts[parts.length - 2]}/${parts[parts.length - 1]}` : c.path
      }),
    },
    {
      label: 'Tasks',
      value: taskCount,
      tone: colors.textSecondary,
      tooltip: taskCount === 1 ? '1 AI task has made commits on this branch.' : `${taskCount} AI tasks have made commits on this branch.`,
      items: undefined as string[] | undefined,
    },
    {
      label: 'Stashes',
      value: stashes.length,
      tone: colors.textTertiary,
      tooltip: stashes.length === 0
        ? 'No stashes saved.'
        : stashes.length === 1 ? '1 stash:' : `${stashes.length} stashes:`,
      items: stashes.map((s) => `stash@{${s.index}}: ${s.message}`),
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status</CardTitle>
      </CardHeader>

      <CardContent>
        <View style={styles.grid}>
          {metrics.map((metric) => (
            <View key={metric.label} style={styles.tileWrapper}>
              <BauhausTooltip label={metric.tooltip} items={metric.items} direction="bottom">
                <View style={[styles.metric, { backgroundColor: colors.backgroundSecondary }]}>
                  <View style={[styles.swatch, { backgroundColor: metric.tone }]} />
                  <Text style={[styles.metricValue, { color: colors.text }]}>{metric.value}</Text>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{metric.label}</Text>
                </View>
              </BauhausTooltip>
            </View>
          ))}
        </View>
      </CardContent>
    </Card>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  tileWrapper: {
    width: '31%',
  },
  metric: {
    minHeight: 88,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    justifyContent: 'space-between',
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  metricValue: {
    ...typeStyles.heading,
  },
  metricLabel: {
    ...typeStyles.meta,
  },
})