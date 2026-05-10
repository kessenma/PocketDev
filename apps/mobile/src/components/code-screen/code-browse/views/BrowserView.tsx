import React, { useCallback, useMemo } from 'react'
import { FlashList } from '@shopify/flash-list'
import ReanimatedLib from 'react-native-reanimated'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { CornerUpLeft, FileCode2, FolderOpen, Maximize2, Minimize2, Pin, Search, WifiOff } from 'lucide-react-native'
import { borderRadius, palette, spacing, type SemanticTheme } from '@pocketdev/shared/theme'
import { useTheme } from '../../../../contexts/ThemeContext'
import { useAdaptiveLayout } from '../../../../hooks/useAdaptiveLayout'
import { useFilesStore } from '../../../../stores/files'
import CodeViewer from '../../../files/CodeViewer'
import { pathToName } from '../../../files/model'
import type { useShrinkableHeader } from '../../../ui/ShrinkableHeader'
import { typeStyles } from '../../../../theme/typography'

const AnimatedFlashList = ReanimatedLib.createAnimatedComponent(FlashList) as typeof FlashList

type BrowserViewProps = {
  scrollHandler: ReturnType<typeof useShrinkableHeader>['scrollHandler']
  expanded: boolean
  onExpandChange: (expanded: boolean) => void
}

type EntryItem = { id: string; path: string; name: string; description: string; kind: 'file' | 'directory' }

export default function BrowserView({ scrollHandler, expanded, onExpandChange }: BrowserViewProps) {
  const { colors } = useTheme()
  const { layoutMode } = useAdaptiveLayout()
  const rootLabel = useFilesStore((state) => state.rootLabel)
  const currentPath = useFilesStore((state) => state.currentPath)
  const currentEntries = useFilesStore((state) => state.currentEntries)
  const selectedFile = useFilesStore((state) => state.selectedFile)
  const selectedFileContent = useFilesStore((state) => state.selectedFileContent)
  const isLoadingContent = useFilesStore((state) => state.isLoadingContent)
  const activePhoneView = useFilesStore((state) => state.activePhoneView)
  const wrapLines = useFilesStore((state) => state.wrapLines)
  const searchQuery = useFilesStore((state) => state.searchQuery)
  const searchResults = useFilesStore((state) => state.searchResults)
  const isSearching = useFilesStore((state) => state.isSearching)
  const selectedContextPaths = useFilesStore((state) => state.selectedContextPaths)
  const lastActionMessage = useFilesStore((state) => state.lastActionMessage)
  const isRefreshing = useFilesStore((state) => state.isRefreshing)
  const offlineMode = useFilesStore((state) => state.offlineMode)
  const setSearchQuery = useFilesStore((state) => state.setSearchQuery)
  const runSearch = useFilesStore((state) => state.runSearch)
  const clearSearch = useFilesStore((state) => state.clearSearch)
  const openDirectory = useFilesStore((state) => state.openDirectory)
  const navigateUp = useFilesStore((state) => state.navigateUp)
  const selectFile = useFilesStore((state) => state.selectFile)
  const goBackToBrowser = useFilesStore((state) => state.goBackToBrowser)
  const toggleWrapLines = useFilesStore((state) => state.toggleWrapLines)
  const toggleContextPath = useFilesStore((state) => state.toggleContextPath)

  const hasSearchResults = searchQuery.trim().length > 0
  const items = hasSearchResults
    ? searchResults.map((result) => ({
        id: `${result.path}-${result.line_number}`,
        path: result.path,
        name: pathToName(result.path),
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

  const extraData = useMemo(
    () => ({ selectedContextPaths, selectedFilePath: selectedFile?.path, colors }),
    [selectedContextPaths, selectedFile?.path, colors],
  )

  const handleSelectFile = useCallback(async (filePath: string) => {
    await selectFile(filePath)
  }, [selectFile])

  const renderEntry = useCallback(({ item }: { item: EntryItem }) => {
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
            void handleSelectFile(item.path)
          }}
        >
          {item.kind === 'directory' ? (
            <FolderOpen color={colors.primary} size={18} strokeWidth={2.2} />
          ) : (
            <FileCode2 color={isCurrentFile ? colors.primary : colors.textSecondary} size={18} strokeWidth={2.2} />
          )}
          <View style={styles.entryCopy}>
            <Text style={[styles.entryTitle, { color: isCurrentFile ? colors.primary : colors.text }]} numberOfLines={1}>
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
  }, [colors, handleSelectFile, openDirectory, selectedContextPaths, selectedFile?.path, toggleContextPath])

  const browserEmptyState = !isRefreshing && !isSearching ? (
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

  if (activePhoneView === 'viewer') {
    return (
      <View style={styles.sectionContainer}>
        <CodeViewer
          file={selectedFile}
          content={selectedFileContent}
          isLoading={isLoadingContent}
          wrapLines={wrapLines}
          onToggleWrap={toggleWrapLines}
          variant="plain"
          onBack={layoutMode === 'phone' ? goBackToBrowser : undefined}
          isContextSelected={selectedFile ? selectedContextPaths.includes(selectedFile.path) : false}
          onToggleContext={selectedFile ? () => toggleContextPath(selectedFile.path) : undefined}
        />
      </View>
    )
  }

  return (
    <View style={styles.sectionContainer}>
      {!expanded ? (
        <View style={styles.browserStaticHeader}>
          <View style={styles.explorerControls}>
            <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Search color={colors.textTertiary} size={16} strokeWidth={2.2} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={`Search in ${currentPath === '.' ? rootLabel || 'project' : currentPath}`}
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

            {offlineMode ? (
              <View style={[styles.offlineBanner, { backgroundColor: colors.backgroundSecondary }]}>
                <WifiOff color={colors.textSecondary} size={14} strokeWidth={2.2} />
                <Text style={[styles.offlineBannerText, { color: colors.textSecondary }]}>
                  Browsing offline cache
                </Text>
              </View>
            ) : null}

            <View style={styles.pathRow}>
              <TouchableOpacity
                onPress={() => {
                  void navigateUp()
                }}
                activeOpacity={0.7}
                disabled={currentPath === '.'}
                style={[
                  styles.pathButton,
                  {
                    borderColor: colors.border,
                    backgroundColor: currentPath === '.' ? colors.backgroundSecondary : colors.surface,
                    opacity: currentPath === '.' ? 0.5 : 1,
                  },
                ]}
              >
                <Text style={[styles.pathButtonText, { color: colors.text }]}>Up</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  void openDirectory('.')
                }}
                activeOpacity={0.7}
                style={[styles.pathButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
              >
                <Text style={[styles.pathButtonText, { color: colors.text }]}>Root</Text>
              </TouchableOpacity>

              <Text style={[styles.pathLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                {currentPath === '.' ? rootLabel || 'Project root' : currentPath}
              </Text>
            </View>
          </View>

          <View style={[styles.messageBanner, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.messageText, { color: colors.textSecondary }]}>{lastActionMessage}</Text>
          </View>

          {isRefreshing || isSearching ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                {isSearching ? 'Searching files...' : 'Loading folder...'}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={[styles.browserCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <View style={[styles.expandRow, { borderBottomColor: colors.border }]}>
          {expanded ? (
            <TouchableOpacity
              onPress={() => void navigateUp()}
              activeOpacity={0.7}
              disabled={currentPath === '.'}
              style={{ opacity: currentPath === '.' ? 0.35 : 1 }}
            >
              <CornerUpLeft color={colors.textTertiary} size={14} strokeWidth={2.2} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={() => onExpandChange(!expanded)}
            activeOpacity={0.7}
            style={styles.expandRowLabel}
          >
            <Text style={[styles.expandPathText, { color: colors.textSecondary }]} numberOfLines={1}>
              {currentPath === '.' ? rootLabel ?? 'Project root' : currentPath}
            </Text>
            {expanded ? (
              <Minimize2 color={colors.textTertiary} size={14} strokeWidth={2.2} />
            ) : (
              <Maximize2 color={colors.textTertiary} size={14} strokeWidth={2.2} />
            )}
          </TouchableOpacity>
        </View>
        <AnimatedFlashList
          data={items}
          renderItem={renderEntry}
          extraData={extraData}
          keyExtractor={(item) => item.id}
          getItemType={(item) => item.kind}
          ListEmptyComponent={browserEmptyState}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          contentContainerStyle={styles.browserListContent}
          style={styles.browserList}
        />
      </View>
    </View>
  )
}

function renderFileLabel(
  name: string,
  kind: 'directory' | 'file',
  colors: SemanticTheme,
  defaultColor: string,
) {
  if (kind === 'directory') return name

  const parts = splitFileName(name)
  if (!parts.extension) return name

  return (
    <>
      {parts.base}
      <Text style={{ color: colorForExtension(parts.extension, colors, defaultColor) }}>{parts.extension}</Text>
    </>
  )
}

function splitFileName(name: string): { base: string; extension: string | null } {
  const dotIndex = name.lastIndexOf('.')
  if (dotIndex <= 0 || dotIndex === name.length - 1) {
    return { base: name, extension: null }
  }
  return {
    base: name.slice(0, dotIndex),
    extension: name.slice(dotIndex),
  }
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
  sectionContainer: {
    flex: 1,
    minHeight: 0,
  },
  browserStaticHeader: {
    gap: spacing[4],
    marginBottom: spacing[4],
  },
  browserListContent: {
    paddingBottom: spacing[8],
  },
  browserList: {
    flex: 1,
  },
  expandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  expandRowLabel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  expandPathText: {
    ...typeStyles.meta,
    flex: 1,
  },
  explorerControls: {
    gap: spacing[3],
  },
  searchBar: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    minHeight: 48,
    paddingHorizontal: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  searchInput: {
    flex: 1,
    ...typeStyles.body,
  },
  searchAction: {
    ...typeStyles.bodySmall,
  },
  pathRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  pathButton: {
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  pathButtonText: {
    ...typeStyles.meta,
  },
  pathLabel: {
    ...typeStyles.bodySmall,
    flex: 1,
  },
  messageBanner: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  messageText: {
    ...typeStyles.bodySmall,
  },
  browserCard: {
    flex: 1,
    minHeight: 0,
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
  },
  loadingText: {
    ...typeStyles.bodySmall,
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
    ...typeStyles.button,
  },
  entryDescription: {
    ...typeStyles.bodySmall,
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
    ...typeStyles.bodyBold,
  },
  emptyBody: {
    ...typeStyles.bodySmall,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  offlineBannerText: {
    ...typeStyles.bodySmall,
  },
})
