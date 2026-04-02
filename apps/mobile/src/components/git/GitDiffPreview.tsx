import React from 'react'
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import GitBadge from './GitBadge'
import { GitCard, GitCardContent, GitCardDescription, GitCardHeader, GitCardTitle } from './GitCard'
import type { GitFileChange } from './model'

type Props = {
  change: GitFileChange | null
}

export default function GitDiffPreview({ change }: Props) {
  const { colors } = useTheme()

  return (
    <GitCard style={styles.card}>
      <GitCardHeader>
        <View style={styles.headerRow}>
          <View style={styles.titleBlock}>
            <GitCardTitle>Diff Preview</GitCardTitle>
            <GitCardDescription>
              {change ? change.path : 'Select a file from the changes list to inspect the patch.'}
            </GitCardDescription>
          </View>
          {change ? <GitBadge variant={change.staged ? 'primary' : 'outline'}>{change.staged ? 'staged' : 'unstaged'}</GitBadge> : null}
        </View>
      </GitCardHeader>

      <GitCardContent style={styles.content}>
        {change ? (
          <ScrollView
            style={[styles.diffContainer, { backgroundColor: colors.backgroundSecondary }]}
            contentContainerStyle={styles.diffContent}
          >
            <Text style={[styles.diffText, { color: colors.text }]}>{change.diff}</Text>
          </ScrollView>
        ) : (
          <View style={[styles.emptyState, { backgroundColor: colors.backgroundSecondary }]}> 
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No file selected</Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>This pane will become a terminal-backed diff viewer once git transport is live.</Text>
          </View>
        )}
      </GitCardContent>
    </GitCard>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 280,
  },
  content: {
    flex: 1,
  },
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
  diffContainer: {
    flex: 1,
    borderRadius: borderRadius.lg,
    minHeight: 220,
  },
  diffContent: {
    padding: spacing[3],
    minHeight: '100%',
  },
  diffText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  emptyState: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[2],
    minHeight: 220,
    justifyContent: 'center',
  },
  emptyTitle: {
    ...typographyScale.base,
    fontWeight: '700',
  },
  emptyBody: {
    ...typographyScale.sm,
  },
})