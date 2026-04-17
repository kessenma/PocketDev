import React, { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { typeStyles } from '../../theme/typography'
import { useTheme } from '../../contexts/ThemeContext'
import GitBadge from './GitBadge'
import { GitCard, GitCardContent, GitCardDescription, GitCardHeader, GitCardTitle } from './GitCard'
import BauhausTooltip from '../shared/BauhausTooltip'
import type { GitFileChange } from './model'

type Props = {
  changes: GitFileChange[]
  selectedFileId: string | null
  onSelect: (fileId: string) => void
}

function getFileName(path: string): string {
  return path.split('/').pop() ?? path
}

export default function GitChangeList({ changes, selectedFileId, onSelect }: Props) {
  const { colors } = useTheme()
  const [allExpanded, setAllExpanded] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const fileCount = changes.length
  const fileLabel = fileCount === 1 ? '1 file' : `${fileCount} files`

  function toggleCard(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <GitCard>
      <GitCardHeader>
        <View style={styles.headerRow}>
          <View>
            <GitCardTitle>Changed Files</GitCardTitle>
            <GitCardDescription>Tap a file to inspect the diff before you commit or push.</GitCardDescription>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.countBadge, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
              <Text style={[styles.countText, { color: colors.textSecondary }]}>{fileLabel}</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setAllExpanded((v) => !v)
                setExpandedIds(new Set())
              }}
              activeOpacity={0.7}
              style={[styles.expandButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
            >
              {allExpanded
                ? <ChevronUp size={14} color={colors.textSecondary} />
                : <ChevronDown size={14} color={colors.textSecondary} />}
            </TouchableOpacity>
          </View>
        </View>
      </GitCardHeader>

      <GitCardContent>
        {changes.length > 0 ? (
          changes.map((change) => {
            const selected = change.id === selectedFileId
            const cardExpanded = allExpanded || expandedIds.has(change.id)
            const fileName = getFileName(change.path)

            return (
              <View
                key={change.id}
                style={[
                  styles.row,
                  {
                    backgroundColor: selected ? colors.primary + '12' : colors.backgroundSecondary,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
              >
                {/* Main content */}
                <View style={styles.rowMain}>
                  <View style={styles.rowHeader}>
                    <TouchableOpacity
                      onPress={() => toggleCard(change.id)}
                      activeOpacity={0.7}
                      style={styles.chevronButton}
                    >
                      {cardExpanded
                        ? <ChevronUp size={14} color={colors.textSecondary} />
                        : <ChevronDown size={14} color={colors.textSecondary} />}
                    </TouchableOpacity>

                    <BauhausTooltip label={change.path} direction="bottom">
                      <Text style={[styles.path, { color: colors.text }]} numberOfLines={1}>
                        {fileName}
                      </Text>
                    </BauhausTooltip>

                    <GitBadge variant={badgeVariant(change.kind)}>{change.kind}</GitBadge>
                  </View>

                  {change.summary ? (
                    <Text style={[styles.summary, { color: colors.textSecondary }]} numberOfLines={2}>
                      {change.summary}
                    </Text>
                  ) : null}

                  <View style={styles.metaRow}>
                    {change.hasLineStats ? (
                      <>
                        {change.additions > 0 ? (
                          <Text style={[styles.meta, { color: colors.success }]}>+{change.additions}</Text>
                        ) : null}
                        {change.deletions > 0 ? (
                          <Text style={[styles.meta, { color: colors.error }]}>-{change.deletions}</Text>
                        ) : null}
                        {change.changedLines != null ? (
                          <Text style={[styles.meta, { color: colors.textSecondary }]}>
                            {change.changedLines} line{change.changedLines === 1 ? '' : 's'}
                          </Text>
                        ) : null}
                      </>
                    ) : (
                      <Text style={[styles.meta, { color: colors.textSecondary }]}>
                        {change.isBinary ? 'binary' : 'no line stats'}
                      </Text>
                    )}
                    <Text style={[styles.meta, { color: colors.textTertiary }]}>
                      {change.staged ? 'staged' : 'unstaged'}
                    </Text>
                  </View>

                  {cardExpanded ? (
                    <View style={[styles.accordion, { borderTopColor: colors.border }]}>
                      <Text style={[styles.fullPath, { color: colors.textSecondary }]}>
                        {change.path}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Right panel — open diff */}
                <TouchableOpacity
                  onPress={() => onSelect(change.id)}
                  activeOpacity={0.7}
                  style={[styles.openPanel, { borderLeftColor: colors.border }]}
                >
                  <ChevronRight size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingTop: 2,
  },
  countBadge: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
  },
  countText: {
    ...typeStyles.button,
  },
  expandButton: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: 5,
  },
  row: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  rowMain: {
    flex: 1,
    padding: spacing[3],
    gap: spacing[2],
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  chevronButton: {
    padding: 2,
  },
  path: {
    ...typeStyles.bodySmall,
    fontWeight: '700',
    flex: 1,
  },
  openPanel: {
    width: 40,
    borderLeftWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordion: {
    borderTopWidth: 1,
    paddingTop: spacing[2],
  },
  fullPath: {
    ...typeStyles.mono,
  },
  summary: {
    ...typeStyles.bodySmall,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  meta: {
    ...typeStyles.sectionTitle,
  },
  emptyState: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[2],
  },
  emptyTitle: {
    ...typeStyles.bodyBold,
  },
  emptyBody: {
    ...typeStyles.bodySmall,
  },
})
