import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import GitBadge from './GitBadge'
import { GitCard, GitCardContent, GitCardDescription, GitCardHeader, GitCardTitle } from './GitCard'
import type { GitCommitEntry } from './model'

type Props = {
  commits: GitCommitEntry[]
}

export default function GitHistoryList({ commits }: Props) {
  const { colors } = useTheme()

  return (
    <GitCard>
      <GitCardHeader>
        <GitCardTitle>Recent Commits</GitCardTitle>
        <GitCardDescription>Short, scan-friendly history for quick phone review.</GitCardDescription>
      </GitCardHeader>

      <GitCardContent>
        {commits.map((commit) => (
          <View key={commit.id} style={[styles.row, { backgroundColor: colors.backgroundSecondary }]}>
            <View style={styles.rowHeader}>
              <GitBadge variant="outline">{commit.sha}</GitBadge>
              <Text style={[styles.time, { color: colors.textTertiary }]}>{commit.relativeTime}</Text>
            </View>
            <Text style={[styles.message, { color: colors.text }]}>{commit.message}</Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {commit.author} · {commit.filesChanged} files changed
            </Text>
          </View>
        ))}
      </GitCardContent>
    </GitCard>
  )
}

const styles = StyleSheet.create({
  row: {
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[2],
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: {
    ...typographyScale.xs,
    fontWeight: '600',
  },
  message: {
    ...typographyScale.sm,
    fontWeight: '700',
  },
  meta: {
    ...typographyScale.xs,
  },
})