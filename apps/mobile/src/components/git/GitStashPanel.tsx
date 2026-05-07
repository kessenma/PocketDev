import React from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Archive, ChevronDown, ChevronUp } from 'lucide-react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { typeStyles } from '../../theme/typography'
import type { GitStashEntry } from '@pocketdev/shared/types'
import { useTheme } from '../../contexts/ThemeContext'
import GitBadge from './GitBadge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import type { GitFileChange } from './model'

type Props = {
  stashes: GitStashEntry[]
  changes: GitFileChange[]
  isStashing: boolean
  onStash: (message?: string) => void
  onPop: (index: number) => void
  onApply: (index: number) => void
  onDrop: (index: number) => void
}

export default function GitStashPanel({ stashes, changes, isStashing, onStash, onPop, onApply, onDrop }: Props) {
  const { colors } = useTheme()
  const [expanded, setExpanded] = React.useState(true)
  const hasChanges = changes.length > 0
  const hasStashes = stashes.length > 0

  if (!hasChanges && !hasStashes) return null

  return (
    <Card>
      <CardHeader>
        <View style={styles.headerRow}>
          <View style={styles.titleBlock}>
            <CardTitle>Stashes</CardTitle>
            <CardDescription>
              {hasStashes
                ? `${stashes.length} stash${stashes.length !== 1 ? 'es' : ''} saved`
                : 'No stashes — save your changes for later.'}
            </CardDescription>
          </View>
          <View style={styles.headerActions}>
            {hasStashes ? (
              <TouchableOpacity
                onPress={() => setExpanded((v) => !v)}
                activeOpacity={0.7}
                style={[styles.iconButton, { borderColor: colors.border }]}
              >
                {expanded
                  ? <ChevronUp color={colors.textSecondary} size={14} strokeWidth={2.5} />
                  : <ChevronDown color={colors.textSecondary} size={14} strokeWidth={2.5} />}
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={() => onStash()}
              disabled={!hasChanges || isStashing}
              activeOpacity={0.7}
              style={[
                styles.stashButton,
                { backgroundColor: hasChanges && !isStashing ? colors.primary : colors.border },
              ]}
            >
              {isStashing
                ? <ActivityIndicator color={colors.primaryText} size="small" />
                : (
                  <View style={styles.stashButtonInner}>
                    <Archive color={colors.primaryText} size={13} strokeWidth={2.5} />
                    <Text style={[styles.stashButtonText, { color: colors.primaryText }]}>Stash</Text>
                  </View>
                )}
            </TouchableOpacity>
          </View>
        </View>
      </CardHeader>

      {hasStashes && expanded ? (
        <CardContent>
          {stashes.map((stash) => (
            <View key={stash.index} style={[styles.stashRow, { backgroundColor: colors.backgroundSecondary }]}>
              <View style={styles.stashMeta}>
                <GitBadge variant="outline">{`stash@{${stash.index}}`}</GitBadge>
                <Text style={[styles.stashTime, { color: colors.textTertiary }]}>{stash.relativeTime}</Text>
              </View>
              <Text style={[styles.stashMessage, { color: colors.text }]} numberOfLines={2}>
                {stash.message}
              </Text>
              {stash.branch ? (
                <Text style={[styles.stashBranch, { color: colors.textSecondary }]}>
                  on {stash.branch}
                </Text>
              ) : null}
              <View style={styles.stashActions}>
                <TouchableOpacity
                  onPress={() => onPop(stash.index)}
                  activeOpacity={0.7}
                  style={[styles.actionButton, { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.actionButtonText, { color: colors.primaryText }]}>Pop</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onApply(stash.index)}
                  activeOpacity={0.7}
                  style={[styles.actionButton, { borderWidth: 1, borderColor: colors.border }]}
                >
                  <Text style={[styles.actionButtonText, { color: colors.text }]}>Apply</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onDrop(stash.index)}
                  activeOpacity={0.7}
                  style={[styles.actionButton, { borderWidth: 1, borderColor: colors.border }]}
                >
                  <Text style={[styles.actionButtonText, { color: colors.error }]}>Drop</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </CardContent>
      ) : null}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  iconButton: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stashButton: {
    height: 28,
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stashButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stashButtonText: {
    ...typeStyles.monoLabel,
  },
  stashRow: {
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[2],
  },
  stashMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stashTime: {
    ...typeStyles.button,
  },
  stashMessage: {
    ...typeStyles.bodySmall,
    fontWeight: '600',
  },
  stashBranch: {
    ...typeStyles.meta,
  },
  stashActions: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  actionButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    ...typeStyles.monoLabel,
  },
})
