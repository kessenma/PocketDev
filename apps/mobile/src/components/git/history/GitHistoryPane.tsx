import React, { useCallback, useEffect } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { ArrowDownToLine, History } from 'lucide-react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { typeStyles } from '../../../theme/typography'
import type { GitDetailedCommitEntry } from '@pocketdev/shared/types'
import { useTheme } from '../../../contexts/ThemeContext'
import { useGitStore } from '../../../stores/git'
import GitCommitDetailRow from './GitCommitDetailRow'

export default function GitHistoryPane() {
  const { colors } = useTheme()
  const detailedCommits = useGitStore((s) => s.detailedCommits)
  const isSyncing = useGitStore((s) => s.isSyncing)
  const isPulling = useGitStore((s) => s.isPulling)
  const remote = useGitStore((s) => s.remote)
  const syncHistory = useGitStore((s) => s.syncHistory)
  const pull = useGitStore((s) => s.pull)

  useEffect(() => {
    if (detailedCommits.length === 0) {
      syncHistory()
    }
  }, [detailedCommits.length, syncHistory])

  const handleRefresh = useCallback(() => {
    syncHistory()
  }, [syncHistory])

  const renderItem = ({ item }: { item: GitDetailedCommitEntry }) => (
    <GitCommitDetailRow commit={item} />
  )

  if (detailedCommits.length === 0 && isSyncing) {
    return (
      <View style={styles.empty}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Syncing commit history...</Text>
      </View>
    )
  }

  if (detailedCommits.length === 0) {
    return (
      <View style={styles.empty}>
        <History color={colors.textTertiary} size={32} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No commit history</Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Pull to refresh or sync from the git workspace.</Text>
      </View>
    )
  }

  const canPull = remote.behind > 0 && !isPulling && !remote.requiresAuth

  return (
    <FlashList
      data={detailedCommits}
      renderItem={renderItem}
      keyExtractor={(item) => item.fullSha}
      getItemType={() => 'commit'}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={{ height: spacing[2] }} />}
      ListHeaderComponent={
        <View style={styles.listHeader}>
          <Text style={[styles.header, { color: colors.textSecondary }]}>
            {detailedCommits.length} commit{detailedCommits.length !== 1 ? 's' : ''}
          </Text>
          {canPull && (
            <TouchableOpacity
              onPress={pull}
              activeOpacity={0.7}
              style={[styles.pullButton, { backgroundColor: colors.primary }]}
            >
              {isPulling ? (
                <ActivityIndicator color={colors.primaryText} size="small" />
              ) : (
                <>
                  <ArrowDownToLine color={colors.primaryText} size={14} strokeWidth={2.5} />
                  <Text style={[styles.pullButtonText, { color: colors.primaryText }]}>
                    Pull {remote.behind} commit{remote.behind !== 1 ? 's' : ''}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      }
      refreshing={isSyncing}
      onRefresh={handleRefresh}
    />
  )
}

const styles = StyleSheet.create({
  list: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  header: {
    ...typeStyles.sectionTitle,
  },
  pullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
  },
  pullButtonText: {
    ...typeStyles.meta,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    padding: spacing[6],
  },
  emptyTitle: {
    ...typeStyles.bodyBold,
  },
  emptyText: {
    ...typeStyles.bodySmall,
    textAlign: 'center',
  },
})
