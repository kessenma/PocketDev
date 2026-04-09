import React, { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { ChevronDown, ChevronRight, FilePlus2, FileMinus2, FileEdit, FileSymlink } from 'lucide-react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import type { GitDetailedCommitEntry, GitCommitFileEntry, GitCommitOrigin } from '@pocketdev/shared/types'
import { useTheme } from '../../contexts/ThemeContext'
import GitBadge from './GitBadge'

type Props = {
  commit: GitDetailedCommitEntry
}

export default function GitCommitDetailRow({ commit }: Props) {
  const { colors } = useTheme()
  const [expanded, setExpanded] = useState(false)
  const Chevron = expanded ? ChevronDown : ChevronRight

  return (
    <Pressable
      onPress={() => setExpanded((v) => !v)}
      style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Chevron color={colors.textTertiary} size={16} strokeWidth={2.5} />
          <GitBadge variant="outline">{commit.sha}</GitBadge>
          {commit.origin && commit.origin !== 'external' && (
            <GitBadge variant={ORIGIN_VARIANT[commit.origin]}>{ORIGIN_LABEL[commit.origin]}</GitBadge>
          )}
        </View>
        <Text style={[styles.time, { color: colors.textTertiary }]}>{commit.relativeTime || formatDate(commit.committedAt)}</Text>
      </View>

      <Text style={[styles.message, { color: colors.text }]} numberOfLines={expanded ? undefined : 1}>
        {commit.message}
      </Text>

      <Text style={[styles.meta, { color: colors.textSecondary }]}>
        {commit.author} · {commit.filesChanged} file{commit.filesChanged !== 1 ? 's' : ''}
      </Text>

      {expanded && (
        <View style={styles.details}>
          {commit.branch && (
            <View style={styles.detailRow}>
              <GitBadge variant="primary">{commit.branch}</GitBadge>
            </View>
          )}

          {commit.authorEmail && (
            <Text style={[styles.detailText, { color: colors.textTertiary }]}>{commit.authorEmail}</Text>
          )}

          <Text style={[styles.detailText, { color: colors.textTertiary }]}>{commit.fullSha}</Text>

          <View style={[styles.fileDivider, { backgroundColor: colors.border }]} />

          {commit.files.map((file, i) => (
            <FileRow key={`${file.path}-${i}`} file={file} colors={colors} />
          ))}
        </View>
      )}
    </Pressable>
  )
}

function FileRow({ file, colors }: { file: GitCommitFileEntry; colors: ReturnType<typeof useTheme>['colors'] }) {
  const Icon = FILE_KIND_ICON[file.kind] ?? FileEdit
  const kindColor = FILE_KIND_COLOR[file.kind]

  return (
    <View style={styles.fileRow}>
      <Icon color={kindColor} size={14} strokeWidth={2} />
      <Text style={[styles.filePath, { color: colors.text }]} numberOfLines={1}>
        {file.path}
        {file.oldPath ? ` ← ${file.oldPath}` : ''}
      </Text>
      <View style={styles.fileDelta}>
        {file.additions > 0 && <Text style={styles.additions}>+{file.additions}</Text>}
        {file.deletions > 0 && <Text style={styles.deletions}>-{file.deletions}</Text>}
      </View>
    </View>
  )
}

const ORIGIN_LABEL: Record<string, string> = {
  app: 'App',
  task: 'AI Task',
}

const ORIGIN_VARIANT: Record<string, 'primary' | 'success' | 'warning'> = {
  app: 'primary',
  task: 'success',
}

const FILE_KIND_ICON = {
  added: FilePlus2,
  deleted: FileMinus2,
  modified: FileEdit,
  renamed: FileSymlink,
} as const

const FILE_KIND_COLOR = {
  added: '#22c55e',
  deleted: '#ef4444',
  modified: '#f59e0b',
  renamed: '#3b82f6',
} as const

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[2],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
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
  details: {
    gap: spacing[2],
    marginTop: spacing[1],
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  detailText: {
    ...typographyScale.xs,
    fontFamily: 'monospace',
  },
  fileDivider: {
    height: 1,
    marginVertical: spacing[1],
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: 2,
  },
  filePath: {
    ...typographyScale.xs,
    flex: 1,
    fontFamily: 'monospace',
  },
  fileDelta: {
    flexDirection: 'row',
    gap: spacing[1],
  },
  additions: {
    ...typographyScale.xs,
    color: '#22c55e',
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  deletions: {
    ...typographyScale.xs,
    color: '#ef4444',
    fontWeight: '700',
    fontFamily: 'monospace',
  },
})
