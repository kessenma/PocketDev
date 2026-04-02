import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { ChevronRight, FileCode2, Folder } from 'lucide-react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { FileCard, FileCardContent, FileCardDescription, FileCardHeader, FileCardTitle } from './FileCard'
import type { FileNode } from './model'

type Props = {
  nodes: FileNode[]
  expandedDirectoryIds: string[]
  selectedFileId: string | null
  onToggleFolder: (folderId: string) => void
  onSelectFile: (fileId: string) => void
}

export default function FileTreeList({
  nodes,
  expandedDirectoryIds,
  selectedFileId,
  onToggleFolder,
  onSelectFile,
}: Props) {
  const { colors } = useTheme()
  const expanded = new Set(expandedDirectoryIds)

  return (
    <FileCard>
      <FileCardHeader>
        <FileCardTitle>Project Files</FileCardTitle>
        <FileCardDescription>
          Browse the project tree from your paired server.
        </FileCardDescription>
      </FileCardHeader>

      <FileCardContent style={styles.content}>
        {nodes.map((node) => (
          <TreeNodeRow
            key={node.id}
            node={node}
            depth={0}
            expanded={expanded}
            selectedFileId={selectedFileId}
            colors={colors}
            onToggleFolder={onToggleFolder}
            onSelectFile={onSelectFile}
          />
        ))}
      </FileCardContent>
    </FileCard>
  )
}

type TreeNodeRowProps = {
  node: FileNode
  depth: number
  expanded: Set<string>
  selectedFileId: string | null
  colors: ReturnType<typeof useTheme>['colors']
  onToggleFolder: (folderId: string) => void
  onSelectFile: (fileId: string) => void
}

function TreeNodeRow({
  node,
  depth,
  expanded,
  selectedFileId,
  colors,
  onToggleFolder,
  onSelectFile,
}: TreeNodeRowProps) {
  const isDirectory = node.kind === 'directory'
  const isExpanded = isDirectory && expanded.has(node.id)
  const isSelected = !isDirectory && selectedFileId === node.id
  const leftInset = spacing[2] + depth * spacing[4]

  return (
    <View style={styles.nodeGroup}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isDirectory ? `${isExpanded ? 'Collapse' : 'Expand'} ${node.name}` : `Open ${node.name}`}
        onPress={() => (isDirectory ? onToggleFolder(node.id) : onSelectFile(node.id))}
        style={[
          styles.nodeRow,
          {
            paddingLeft: leftInset,
            backgroundColor: isSelected ? colors.primary + '16' : 'transparent',
          },
        ]}
      >
        {isDirectory ? (
          <ChevronRight
            color={colors.textTertiary}
            size={16}
            strokeWidth={2.2}
            style={isExpanded ? styles.expandedIcon : undefined}
          />
        ) : (
          <View style={styles.chevronSpacer} />
        )}
        {isDirectory ? (
          <Folder color={colors.primary} size={16} strokeWidth={2.1} />
        ) : (
          <FileCode2 color={isSelected ? colors.primary : colors.textSecondary} size={16} strokeWidth={2.1} />
        )}
        <Text
          numberOfLines={1}
          style={[styles.nodeLabel, { color: isSelected ? colors.primary : colors.text }]}
        >
          {node.name}
        </Text>
      </Pressable>

      {isDirectory && isExpanded
        ? node.children?.map((child) => (
            <TreeNodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              selectedFileId={selectedFileId}
              colors={colors}
              onToggleFolder={onToggleFolder}
              onSelectFile={onSelectFile}
            />
          ))
        : null}
    </View>
  )
}

const styles = StyleSheet.create({
  content: {
    gap: spacing[1],
  },
  nodeGroup: {
    gap: spacing[1],
  },
  nodeRow: {
    minHeight: 44,
    borderRadius: borderRadius.md,
    paddingRight: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  chevronSpacer: {
    width: 16,
  },
  expandedIcon: {
    transform: [{ rotate: '90deg' }],
  },
  nodeLabel: {
    ...typographyScale.sm,
    fontWeight: '600',
    flex: 1,
  },
})
