import React, { useCallback } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { FileCode2, FolderOpen, Pin, Search, X } from 'lucide-react-native'
import { borderRadius, palette, spacing, typographyScale, type SemanticTheme } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { useFilesStore } from '../../stores/files'

type Props = {
  visible: boolean
  onClose: () => void
}

type EntryItem = {
  id: string
  path: string
  name: string
  description: string
  kind: 'file' | 'directory'
}

export default function FileExplorerSheet({ visible, onClose }: Props) {
  const { colors } = useTheme()
  const currentPath = useFilesStore((state) => state.currentPath)
  const currentEntries = useFilesStore((state) => state.currentEntries)
  const rootLabel = useFilesStore((state) => state.rootLabel)
  const selectedFile = useFilesStore((state) => state.selectedFile)
  const searchQuery = useFilesStore((state) => state.searchQuery)
  const searchResults = useFilesStore((state) => state.searchResults)
  const isSearching = useFilesStore((state) => state.isSearching)
  const isRefreshing = useFilesStore((state) => state.isRefreshing)
  const selectedContextPaths = useFilesStore((state) => state.selectedContextPaths)
  const openDirectory = useFilesStore((state) => state.openDirectory)
  const navigateUp = useFilesStore((state) => state.navigateUp)
  const selectFile = useFilesStore((state) => state.selectFile)
  const setSearchQuery = useFilesStore((state) => state.setSearchQuery)
  const runSearch = useFilesStore((state) => state.runSearch)
  const clearSearch = useFilesStore((state) => state.clearSearch)
  const toggleContextPath = useFilesStore((state) => state.toggleContextPath)

  const hasSearchResults = searchQuery.trim().length > 0
  const pathLabel = currentPath === '.' ? rootLabel ?? 'Project root' : currentPath

  const items: EntryItem[] = hasSearchResults
    ? searchResults.map((result) => ({
        id: `${result.path}-${result.line_number}`,
        path: result.path,
        name: result.path.split('/').pop() ?? result.path,
        description: result.text || 'Match',
        kind: 'file' as const,
      }))
    : currentEntries.map((entry) => ({
        id: entry.id,
        path: entry.path,
        name: entry.name,
        description: entry.kind === 'directory' ? 'Folder' : entry.path,
        kind: entry.kind,
      }))

  const extraData = React.useMemo(
    () => ({ selectedContextPaths, selectedFilePath: selectedFile?.path, colors }),
    [selectedContextPaths, selectedFile?.path, colors],
  )

  const renderEntry = useCallback(
    ({ item }: { item: EntryItem }) => {
      const isPinned = selectedContextPaths.includes(item.path)
      const isCurrentFile = selectedFile?.path === item.path

      return (
        <View style={[styles.entryRow, { borderBottomColor: colors.border }]}>
          <Pressable
            style={styles.entryMain}
            onPress={() => {
              if (item.kind === 'directory') {
                void openDirectory(item.path)
                return
              }
              void selectFile(item.path)
              onClose()
            }}
          >
            {item.kind === 'directory' ? (
              <FolderOpen color={colors.primary} size={18} strokeWidth={2.2} />
            ) : (
              <FileCode2
                color={isCurrentFile ? colors.primary : colors.textSecondary}
                size={18}
                strokeWidth={2.2}
              />
            )}
            <View style={styles.entryCopy}>
              <Text
                style={[styles.entryTitle, { color: isCurrentFile ? colors.primary : colors.text }]}
                numberOfLines={1}
              >
                {renderFileLabel(item.name, item.kind, colors, isCurrentFile ? colors.primary : colors.text)}
              </Text>
              <Text style={[styles.entryDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                {item.description}
              </Text>
            </View>
          </Pressable>

          {item.kind === 'file' ? (
            <TouchableOpacity
              onPress={() => toggleContextPath(item.path)}
              activeOpacity={0.7}
              style={[
                styles.pinButton,
                {
                  borderColor: isPinned ? colors.primary : colors.border,
                  backgroundColor: isPinned ? colors.primary + '18' : colors.surface,
                },
              ]}
            >
              <Pin color={isPinned ? colors.primary : colors.textSecondary} size={14} strokeWidth={2.2} />
            </TouchableOpacity>
          ) : null}
        </View>
      )
    },
    [selectedContextPaths, selectedFile?.path, colors, openDirectory, selectFile, toggleContextPath, onClose],
  )

  const emptyState =
    !isRefreshing && !isSearching ? (
      <View style={[styles.emptyState, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          {hasSearchResults ? 'No search results' : 'This folder is empty'}
        </Text>
        <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
          {hasSearchResults
            ? 'Try a different query or clear the search to keep browsing.'
            : 'Choose another path or refresh from the server.'}
        </Text>
      </View>
    ) : null

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.breadcrumbRow}>
            <TouchableOpacity
              onPress={() => {
                void navigateUp()
              }}
              activeOpacity={0.7}
              disabled={currentPath === '.'}
              style={[
                styles.navButton,
                {
                  borderColor: colors.border,
                  backgroundColor: currentPath === '.' ? colors.backgroundSecondary : colors.surface,
                  opacity: currentPath === '.' ? 0.5 : 1,
                },
              ]}
            >
              <Text style={[styles.navButtonText, { color: colors.text }]}>Up</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                void openDirectory('.')
              }}
              activeOpacity={0.7}
              style={[styles.navButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
            >
              <Text style={[styles.navButtonText, { color: colors.text }]}>Root</Text>
            </TouchableOpacity>

            <Text style={[styles.breadcrumbText, { color: colors.textSecondary }]} numberOfLines={1}>
              {pathLabel}
            </Text>
          </View>

          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.7}
            style={[styles.closeButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <X color={colors.text} size={18} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search color={colors.textTertiary} size={16} strokeWidth={2.2} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={`Search in ${pathLabel}`}
            placeholderTextColor={colors.textTertiary}
            style={[styles.searchInput, { color: colors.text }]}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={() => {
              void runSearch()
            }}
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={clearSearch} accessibilityRole="button">
              <Text style={[styles.searchAction, { color: colors.primary }]}>Clear</Text>
            </Pressable>
          ) : null}
        </View>

        {isRefreshing || isSearching ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              {isSearching ? 'Searching files...' : 'Loading folder...'}
            </Text>
          </View>
        ) : null}

        <View style={[styles.listContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <FlashList
            data={items}
            renderItem={renderEntry}
            extraData={extraData}
            keyExtractor={(item) => item.id}
            getItemType={(item) => item.kind}
            ListEmptyComponent={emptyState}
          />
        </View>
      </SafeAreaView>
    </Modal>
  )
}

function renderFileLabel(
  name: string,
  kind: 'directory' | 'file',
  colors: SemanticTheme,
  defaultColor: string,
) {
  if (kind === 'directory') return name

  const dotIndex = name.lastIndexOf('.')
  if (dotIndex <= 0 || dotIndex === name.length - 1) return name

  const base = name.slice(0, dotIndex)
  const extension = name.slice(dotIndex)

  return (
    <>
      {base}
      <Text style={{ color: colorForExtension(extension, colors, defaultColor) }}>{extension}</Text>
    </>
  )
}

function colorForExtension(extension: string, colors: SemanticTheme, defaultColor: string): string {
  switch (extension.toLowerCase()) {
    case '.ts':
    case '.tsx':
      return colors.primary
    case '.js':
    case '.jsx':
    case '.mjs':
    case '.cjs':
      return palette.warning[600]
    case '.py':
      return colors.success
    case '.md':
    case '.markdown':
    case '.mdx':
      return palette.accent[600]
    case '.rs':
      return colors.error
    case '.json':
    case '.jsonc':
      return palette.primary[500]
    case '.yml':
    case '.yaml':
    case '.toml':
      return palette.accent[700]
    case '.sh':
    case '.bash':
    case '.zsh':
    case '.fish':
      return palette.success[700]
    case '.html':
    case '.css':
    case '.scss':
    case '.sass':
    case '.less':
      return palette.warning[700]
    case '.sql':
      return palette.accent[500]
    default:
      return defaultColor
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingBottom: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  breadcrumbRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  navButton: {
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  navButtonText: {
    ...typographyScale.xs,
    fontWeight: '700',
  },
  breadcrumbText: {
    ...typographyScale.sm,
    flex: 1,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    minHeight: 44,
    paddingHorizontal: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  searchInput: {
    flex: 1,
    ...typographyScale.base,
  },
  searchAction: {
    ...typographyScale.sm,
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
  },
  loadingText: {
    ...typographyScale.sm,
  },
  listContainer: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  entryMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  entryCopy: {
    flex: 1,
    gap: 2,
  },
  entryTitle: {
    ...typographyScale.base,
    fontWeight: '600',
  },
  entryDescription: {
    ...typographyScale.sm,
  },
  pinButton: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    padding: spacing[4],
    gap: spacing[2],
    margin: spacing[4],
    borderRadius: borderRadius.lg,
  },
  emptyTitle: {
    ...typographyScale.base,
    fontWeight: '700',
  },
  emptyBody: {
    ...typographyScale.sm,
  },
})
