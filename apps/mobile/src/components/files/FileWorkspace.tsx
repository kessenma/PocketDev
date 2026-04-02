import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Code2 } from 'lucide-react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { useAdaptiveLayout } from '../../hooks/useAdaptiveLayout'
import { useFilesStore } from '../../stores/files'
import SplitViewLayout from '../layout/SplitViewLayout'
import CodeViewer from './CodeViewer'
import FileTreeList from './FileTreeList'
import type { FileNode } from './model'

export default function FileWorkspace() {
  const { colors } = useTheme()
  const { layoutMode } = useAdaptiveLayout()
  const rootLabel = useFilesStore((state) => state.rootLabel)
  const rootPath = useFilesStore((state) => state.rootPath)
  const tree = useFilesStore((state) => state.tree)
  const expandedDirectoryIds = useFilesStore((state) => state.expandedDirectoryIds)
  const selectedFileId = useFilesStore((state) => state.selectedFileId)
  const activePhoneView = useFilesStore((state) => state.activePhoneView)
  const selectedFileContent = useFilesStore((state) => state.selectedFileContent)
  const isLoadingContent = useFilesStore((state) => state.isLoadingContent)
  const wrapLines = useFilesStore((state) => state.wrapLines)
  const lastActionMessage = useFilesStore((state) => state.lastActionMessage)
  const isRefreshing = useFilesStore((state) => state.isRefreshing)
  const toggleFolder = useFilesStore((state) => state.toggleFolder)
  const selectFile = useFilesStore((state) => state.selectFile)
  const goBackToBrowser = useFilesStore((state) => state.goBackToBrowser)
  const toggleWrapLines = useFilesStore((state) => state.toggleWrapLines)
  const refresh = useFilesStore((state) => state.refresh)
  const selectedFile = useFilesStore((state) => state.tree)
    ? findFileNode(tree, selectedFileId)
    : null

  const browserPane = (
    <View style={styles.stack}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.eyebrow, { color: colors.textTertiary }]}>Files</Text>
          <View style={styles.titleRow}>
            <Code2 color={colors.primary} size={18} strokeWidth={2.2} />
            <Text style={[styles.title, { color: colors.text }]}>File Explorer</Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Browse the project workspace on your paired server.
          </Text>
        </View>

        <Text
          accessibilityRole="button"
          onPress={refresh}
          style={[styles.refreshLink, { color: isRefreshing ? colors.textTertiary : colors.primary }]}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Text>
      </View>

      <View style={[styles.repoBanner, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={[styles.repoLabel, { color: colors.text }]}>{rootLabel}</Text>
        <Text style={[styles.repoPath, { color: colors.textSecondary }]}>{rootPath}</Text>
      </View>

      <View style={[styles.messageBanner, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={[styles.messageText, { color: colors.textSecondary }]}>{lastActionMessage}</Text>
      </View>

      <FileTreeList
        nodes={tree}
        expandedDirectoryIds={expandedDirectoryIds}
        selectedFileId={selectedFileId}
        onToggleFolder={toggleFolder}
        onSelectFile={selectFile}
      />
    </View>
  )

  const viewerPane = (
    <CodeViewer
      file={selectedFile}
      content={selectedFileContent}
      isLoading={isLoadingContent}
      wrapLines={wrapLines}
      onToggleWrap={toggleWrapLines}
      onBack={layoutMode === 'phone' ? goBackToBrowser : undefined}
    />
  )

  const content = layoutMode === 'tabletSplit'
    ? (
      <SplitViewLayout
        leading={browserPane}
        trailing={viewerPane}
        leadingWidth={360}
      />
    )
    : activePhoneView === 'viewer'
      ? viewerPane
      : browserPane

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {content}
    </ScrollView>
  )
}

function findFileNode(nodes: FileNode[], selectedFileId: string | null): FileNode | null {
  for (const node of nodes) {
    if (node.kind === 'file' && node.id === selectedFileId) return node
    if (node.children?.length) {
      const child = findFileNode(node.children, selectedFileId)
      if (child) return child
    }
  }

  return null
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    gap: spacing[4],
    paddingBottom: spacing[8],
    flexGrow: 1,
  },
  stack: {
    gap: spacing[4],
    flex: 1,
  },
  header: {
    gap: spacing[3],
  },
  headerText: {
    gap: spacing[1],
  },
  eyebrow: {
    ...typographyScale.xs,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  title: {
    ...typographyScale['2xl'],
    fontWeight: '700',
  },
  subtitle: {
    ...typographyScale.base,
    maxWidth: 760,
  },
  refreshLink: {
    ...typographyScale.sm,
    fontWeight: '700',
    alignSelf: 'flex-start',
  },
  repoBanner: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    gap: spacing[1],
  },
  repoLabel: {
    ...typographyScale.base,
    fontWeight: '700',
  },
  repoPath: {
    ...typographyScale.sm,
  },
  messageBanner: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  messageText: {
    ...typographyScale.sm,
  },
})
