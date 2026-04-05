import React from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { FileCode2, FolderOpen, Pin, RefreshCcw, Search } from 'lucide-react-native'
import { borderRadius, palette, spacing, typographyScale, type SemanticTheme } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { useAdaptiveLayout } from '../../hooks/useAdaptiveLayout'
import { useFilesStore } from '../../stores/files'
import { usePreviewStore } from '../../stores/preview'
import { useProjectsStore } from '../../stores/projects'
import CodeViewer from './CodeViewer'
import { pathToName } from './model'
import ServerWebBrowserSheet from '../browser/ServerWebBrowserSheet'

type Props = {
  onOpenProjects: () => void
  currentBranch?: string
}

export default function FileWorkspace({ onOpenProjects, currentBranch = 'No branch' }: Props) {
  const { colors } = useTheme()
  const { layoutMode } = useAdaptiveLayout()
  const projects = useProjectsStore((state) => state.projects)
  const activeProject = projects.find((project) => project.isActive) ?? null
  const rootLabel = useFilesStore((state) => state.rootLabel)
  const rootPath = useFilesStore((state) => state.rootPath)
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
  const setSearchQuery = useFilesStore((state) => state.setSearchQuery)
  const runSearch = useFilesStore((state) => state.runSearch)
  const clearSearch = useFilesStore((state) => state.clearSearch)
  const openDirectory = useFilesStore((state) => state.openDirectory)
  const navigateUp = useFilesStore((state) => state.navigateUp)
  const selectFile = useFilesStore((state) => state.selectFile)
  const goBackToBrowser = useFilesStore((state) => state.goBackToBrowser)
  const toggleWrapLines = useFilesStore((state) => state.toggleWrapLines)
  const refresh = useFilesStore((state) => state.refresh)
  const toggleContextPath = useFilesStore((state) => state.toggleContextPath)
  const clearContextPaths = useFilesStore((state) => state.clearContextPaths)
  const previewVisible = usePreviewStore((state) => state.visible)
  const previewProxiedUrl = usePreviewStore((state) => state.proxiedUrl)
  const openPreview = usePreviewStore((state) => state.openPreview)
  const closePreview = usePreviewStore((state) => state.closePreview)
  const markPreviewLoaded = usePreviewStore((state) => state.markLoaded)
  const markPreviewFailed = usePreviewStore((state) => state.markFailed)

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

  const browserPane = (
    <View style={styles.stack}>
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

      <View style={[styles.browserCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {isRefreshing || isSearching ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              {isSearching ? 'Searching files...' : 'Loading folder...'}
            </Text>
          </View>
        ) : null}

        {items.map((item) => {
          const isPinned = selectedContextPaths.includes(item.path)
          const isCurrentFile = selectedFile?.path === item.path

          return (
            <View key={item.id} style={[styles.entryRow, { borderBottomColor: colors.border }]}>
              <Pressable
                style={styles.entryMain}
                onPress={() => {
                  if (item.kind === 'directory') {
                    void openDirectory(item.path)
                    return
                  }
                  void selectFile(item.path)
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
        })}

        {items.length === 0 && !isRefreshing && !isSearching ? (
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
        ) : null}
      </View>
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
      isContextSelected={selectedFile ? selectedContextPaths.includes(selectedFile.path) : false}
      onToggleContext={selectedFile ? () => toggleContextPath(selectedFile.path) : undefined}
    />
  )

  const content = activePhoneView === 'viewer' ? viewerPane : browserPane

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.headerTop}>
            <View style={styles.headerCopy}>
              <Text style={[styles.headerEyebrow, { color: colors.textTertiary }]}>Code Browser</Text>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {activeProject?.name ?? rootLabel ?? 'Select a repository'}
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                {activeProject?.localPath ?? rootPath ?? 'Choose a repository to browse files.'}
              </Text>
            </View>

            <View style={styles.headerMeta}>
              <Text style={[styles.metaBadge, { color: colors.primary, borderColor: colors.primary + '40' }]}>
                {currentBranch}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={onOpenProjects}
              activeOpacity={0.7}
              style={[styles.secondaryAction, { borderColor: colors.border }]}
            >
              <Text style={[styles.secondaryActionText, { color: colors.text }]}>Switch Repo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                void refresh()
              }}
              activeOpacity={0.7}
              style={[styles.secondaryAction, { borderColor: colors.border }]}
            >
              <RefreshCcw color={colors.text} size={16} strokeWidth={2.2} />
              <Text style={[styles.secondaryActionText, { color: colors.text }]}>Refresh</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                void openPreview()
              }}
              activeOpacity={0.7}
              style={[styles.primaryAction, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.primaryActionText, { color: colors.primaryText }]}>Preview</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.contextTray, { backgroundColor: colors.backgroundSecondary }]}>
          <View style={styles.contextTrayHeader}>
            <Text style={[styles.contextTrayLabel, { color: colors.textTertiary }]}>AI Context</Text>
            {selectedContextPaths.length > 0 ? (
              <TouchableOpacity onPress={clearContextPaths} activeOpacity={0.7}>
                <Text style={[styles.clearText, { color: colors.primary }]}>Clear</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {selectedContextPaths.length > 0 ? (
            <View style={styles.contextChipRow}>
              {selectedContextPaths.map((path) => (
                <View key={path} style={[styles.contextChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.contextChipText, { color: colors.text }]} numberOfLines={1}>
                    {path}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.emptyInlineText, { color: colors.textSecondary }]}>
              Pin files from the browser or code viewer, then ask AI with focused repo context.
            </Text>
          )}
        </View>

        {content}
      </ScrollView>

      {previewProxiedUrl ? (
        <ServerWebBrowserSheet
          visible={previewVisible}
          title={activeProject?.name ?? 'Preview'}
          initialUrl={previewProxiedUrl}
          onClose={closePreview}
          onLoadSuccess={markPreviewLoaded}
          onLoadFailure={markPreviewFailed}
          errorHint="Start the dev server on the paired machine and make sure it is serving localhost:3000."
        />
      ) : null}
    </>
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
  container: {
    flex: 1,
  },
  content: {
    gap: spacing[4],
    paddingBottom: spacing[8],
    flexGrow: 1,
  },
  headerCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    gap: spacing[3],
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  headerCopy: {
    flex: 1,
    gap: spacing[1],
  },
  headerEyebrow: {
    ...typographyScale.xs,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  headerTitle: {
    ...typographyScale['2xl'],
    fontWeight: '700',
  },
  headerSubtitle: {
    ...typographyScale.sm,
  },
  headerMeta: {
    alignItems: 'flex-end',
  },
  metaBadge: {
    ...typographyScale.xs,
    fontWeight: '700',
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    overflow: 'hidden',
  },
  headerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  primaryActionText: {
    ...typographyScale.sm,
    fontWeight: '700',
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: 'transparent',
  },
  secondaryActionText: {
    ...typographyScale.sm,
    fontWeight: '700',
  },
  contextTray: {
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    gap: spacing[3],
  },
  contextTrayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contextTrayLabel: {
    ...typographyScale.xs,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  clearText: {
    ...typographyScale.sm,
    fontWeight: '700',
  },
  contextChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  contextChip: {
    maxWidth: '100%',
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  contextChipText: {
    ...typographyScale.xs,
    fontWeight: '600',
    maxWidth: 260,
  },
  emptyInlineText: {
    ...typographyScale.sm,
  },
  stack: {
    gap: spacing[4],
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
    ...typographyScale.base,
  },
  searchAction: {
    ...typographyScale.sm,
    fontWeight: '700',
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
    ...typographyScale.xs,
    fontWeight: '700',
  },
  pathLabel: {
    ...typographyScale.sm,
    flex: 1,
  },
  messageBanner: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  messageText: {
    ...typographyScale.sm,
  },
  browserCard: {
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
    ...typographyScale.sm,
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
