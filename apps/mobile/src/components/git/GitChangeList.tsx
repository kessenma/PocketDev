import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import GitBadge from './GitBadge'
import { GitCard, GitCardContent, GitCardDescription, GitCardHeader, GitCardTitle } from './GitCard'
import type { GitFileChange } from './model'

type Props = {
  changes: GitFileChange[]
  selectedFileId: string | null
  onSelect: (fileId: string) => void
}

export default function GitChangeList({ changes, selectedFileId, onSelect }: Props) {
  const { colors } = useTheme()

  return (
    <GitCard>
      <GitCardHeader>
        <GitCardTitle>Changed Files</GitCardTitle>
        <GitCardDescription>Tap a file to inspect the diff before you commit or push.</GitCardDescription>
      </GitCardHeader>

      <GitCardContent>
        {changes.length > 0 ? (
          changes.map((change) => {
            const selected = change.id === selectedFileId

            return (
              <TouchableOpacity
                key={change.id}
                activeOpacity={0.7}
                onPress={() => onSelect(change.id)}
                style={[
                  styles.row,
                  {
                    backgroundColor: selected ? colors.primary + '12' : colors.backgroundSecondary,
                    borderColor: selected ? colors.primary : 'transparent',
                  },
                ]}
              >
                <View style={styles.rowHeader}>
                  <Text style={[styles.path, { color: colors.text }]} numberOfLines={1}>
                    {change.path}
                  </Text>
                  <GitBadge variant={badgeVariant(change.kind)}>{change.kind}</GitBadge>
                </View>

                <Text style={[styles.summary, { color: colors.textSecondary }]} numberOfLines={2}>
                  {change.summary}
                </Text>

                <View style={styles.metaRow}>
                  <Text style={[styles.meta, { color: colors.success }]}>+{change.additions}</Text>
                  <Text style={[styles.meta, { color: colors.error }]}>-{change.deletions}</Text>
                  <Text style={[styles.meta, { color: colors.textTertiary }]}>
                    {change.staged ? 'staged' : 'unstaged'}
                  </Text>
                </View>
              </TouchableOpacity>
            )
          })
        ) : (
          <View style={[styles.emptyState, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Working tree clean</Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>There are no file changes left to review.</Text>
          </View>
        )}
      </GitCardContent>
    </GitCard>
  )
}

function badgeVariant(kind: GitFileChange['kind']) {
  switch (kind) {
    case 'added':
      return 'success'
    case 'deleted':
      return 'error'
    case 'renamed':
      return 'primary'
    default:
      return 'warning'
  }
}

const styles = StyleSheet.create({
  row: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[2],
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  path: {
    ...typographyScale.sm,
    fontWeight: '700',
    flex: 1,
  },
  summary: {
    ...typographyScale.sm,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  meta: {
    ...typographyScale.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  emptyState: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[2],
  },
  emptyTitle: {
    ...typographyScale.base,
    fontWeight: '700',
  },
  emptyBody: {
    ...typographyScale.sm,
  },
})