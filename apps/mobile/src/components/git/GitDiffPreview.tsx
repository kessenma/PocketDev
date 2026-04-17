import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { typeStyles } from '../../theme/typography'
import { useTheme } from '../../contexts/ThemeContext'
import GitBadge from './GitBadge'
import { GitCard, GitCardContent, GitCardHeader } from './GitCard'
import type { GitDiffHunk, GitFileChange } from './model'
import { inferLanguage } from '../files/model'
import type { FileNode } from '../files/model'
import CodeViewer from '../files/CodeViewer'
import { fetchFileContent } from '../../services/api'
import { useConnectionStore } from '../../stores/connection'

type PreviewMode = 'file' | 'patch'

type Props = {
  change: GitFileChange | null
  variant?: 'card' | 'plain'
}

export default function GitDiffPreview({ change, variant = 'card' }: Props) {
  const { colors } = useTheme()
  const [mode, setMode] = useState<PreviewMode>('file')
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [isLoadingSource, setIsLoadingSource] = useState(false)
  const [wrapLines, setWrapLines] = useState(true)

  // Reset mode when file changes
  useEffect(() => {
    setMode(defaultModeForChange(change))
    setFileContent(null)
  }, [change?.id, change?.isBinary, change?.kind])

  const loadSourceContent = useCallback(async () => {
    if (!change || isLoadingSource) return
    const server = useConnectionStore.getState().server
    if (!server) return

    setIsLoadingSource(true)
    try {
      const result = await fetchFileContent(server.ip, server.port, change.path)
      setFileContent(result.content)
    } catch {
      setFileContent(null)
    } finally {
      setIsLoadingSource(false)
    }
  }, [change, isLoadingSource])

  const handleModeChange = useCallback((newMode: PreviewMode) => {
    setMode(newMode)
    if (newMode === 'file' && fileContent === null && !isLoadingSource && canShowSource(change)) {
      loadSourceContent()
    }
  }, [change, fileContent, isLoadingSource, loadSourceContent])

  useEffect(() => {
    if (mode === 'file' && fileContent === null && !isLoadingSource && canShowSource(change)) {
      loadSourceContent()
    }
  }, [change, fileContent, isLoadingSource, loadSourceContent, mode])

  const fileNode: FileNode | null = change
    ? {
        id: change.id,
        name: change.path.split('/').pop() ?? change.path,
        path: change.path,
        kind: 'file',
        language: inferLanguage(change.path),
      }
    : null

  const header = (
    <View style={styles.headerSection}>
      <View style={styles.headerRow}>
        <Text style={[styles.filePath, { color: colors.text }]} numberOfLines={1}>
          {change?.path ?? 'No file selected'}
        </Text>
        {change ? (
          <GitBadge variant={change.staged ? 'primary' : 'outline'}>
            {change.staged ? 'staged' : 'unstaged'}
          </GitBadge>
        ) : null}
      </View>
      {change ? (
        <Text style={[styles.headerMeta, { color: colors.textSecondary }]}>
          {describeChangeMeta(change)}
        </Text>
      ) : null}

      {change ? (
        <View style={[styles.modeToggle, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
          {canShowSource(change) ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleModeChange('file')}
              style={[
                styles.modeButton,
                mode === 'file' && { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.modeLabel, { color: mode === 'file' ? colors.text : colors.textSecondary }]}>
                File
              </Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleModeChange('patch')}
            style={[
              styles.modeButton,
              mode === 'patch' && { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modeLabel, { color: mode === 'patch' ? colors.text : colors.textSecondary }]}>
              Patch
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  )

  const body = (
    <View style={styles.content}>
      {change ? (
        mode === 'patch' ? (
          change.diff ? (
            <ScrollView
              style={[styles.diffContainer, { backgroundColor: colors.backgroundSecondary }]}
              contentContainerStyle={styles.diffContent}
            >
              <Text style={[styles.diffText, { color: colors.text }]}>{change.diff}</Text>
            </ScrollView>
          ) : (
            <View style={[styles.loadingState, { backgroundColor: colors.backgroundSecondary }]}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Loading diff...
              </Text>
            </View>
          )
        ) : (
          <CodeViewer
            file={fileNode}
            content={fileContent}
            isLoading={isLoadingSource}
            wrapLines={wrapLines}
            onToggleWrap={() => setWrapLines((v) => !v)}
            variant={variant === 'plain' ? 'plain' : 'card'}
            lineHighlights={toLineHighlights(change.hunks)}
            highlightLabel={describeViewerHighlight(change)}
          />
        )
      ) : (
        <View style={[styles.emptyState, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No file selected</Text>
          <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
            Tap a changed file to preview the diff or view the source.
          </Text>
        </View>
      )}
    </View>
  )

  if (!change) {
    if (variant === 'plain') {
      return <View style={styles.plainContainer}>{body}</View>
    }

    return (
      <GitCard style={styles.card}>
        <GitCardContent style={styles.content}>{body}</GitCardContent>
      </GitCard>
    )
  }

  if (variant === 'plain') {
    return (
      <View style={styles.plainContainer}>
        {header}
        {body}
      </View>
    )
  }

  return (
    <GitCard style={styles.card}>
      <GitCardHeader>{header}</GitCardHeader>
      <GitCardContent style={styles.content}>{body}</GitCardContent>
    </GitCard>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 280,
  },
  plainContainer: {
    flex: 1,
    gap: spacing[3],
  },
  headerSection: {
    gap: spacing[3],
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  filePath: {
    ...typeStyles.bodySmall,
    fontWeight: '700',
    flex: 1,
  },
  headerMeta: {
    ...typeStyles.meta,
    fontWeight: '500',
  },
  modeToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: borderRadius.full,
    padding: 2,
    gap: 2,
  },
  modeButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modeLabel: {
    ...typeStyles.button,
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
    ...typeStyles.mono,
  },
  loadingState: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[3],
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typeStyles.bodySmall,
    fontWeight: '500',
  },
  emptyState: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[2],
    minHeight: 220,
    justifyContent: 'center',
  },
  emptyTitle: {
    ...typeStyles.bodyBold,
  },
  emptyBody: {
    ...typeStyles.bodySmall,
  },
})

function defaultModeForChange(change: GitFileChange | null): PreviewMode {
  if (!change) return 'file'
  return canShowSource(change) ? 'file' : 'patch'
}

function canShowSource(change: GitFileChange | null) {
  if (!change) return false
  if (change.kind === 'deleted') return false
  if (change.isBinary) return false
  return true
}

function toLineHighlights(hunks: GitDiffHunk[] | undefined) {
  if (!hunks?.length) return []

  return hunks
    .filter((hunk) => hunk.newLines > 0)
    .map((hunk) => ({
      start: hunk.newStart,
      end: hunk.newStart + hunk.newLines - 1,
    }))
}

function describeViewerHighlight(change: GitFileChange) {
  if (change.isBinary) return 'Binary changes cannot be highlighted inline.'
  if (change.changedLines == null) return 'Changed lines highlighted inline when available.'
  if (change.changedLines === 1) return '1 changed line highlighted in the file.'
  return `${change.changedLines} changed lines highlighted in the file.`
}

function describeChangeMeta(change: GitFileChange) {
  if (change.isBinary) return `${change.staged ? 'Staged' : 'Unstaged'} binary change`
  if (change.changedLines == null) return `${change.staged ? 'Staged' : 'Unstaged'} file change`
  if (change.changedLines === 1) return `${change.staged ? 'Staged' : 'Unstaged'} · 1 changed line`
  return `${change.staged ? 'Staged' : 'Unstaged'} · ${change.changedLines} changed lines`
}
