import React from 'react'
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { FileCard, FileCardContent, FileCardDescription, FileCardHeader, FileCardTitle } from './FileCard'
import FileBreadcrumbs from './FileBreadcrumbs'
import FileViewerToolbar from './FileViewerToolbar'
import type { FileNode } from './model'

type Props = {
  file: FileNode | null
  content: string | null
  isLoading: boolean
  wrapLines: boolean
  onToggleWrap: () => void
  onBack?: () => void
}

const SUPPORTED_LANGUAGES = new Set(['typescript', 'tsx', 'javascript', 'jsx'])

export default function CodeViewer({ file, content, isLoading, wrapLines, onToggleWrap, onBack }: Props) {
  const { colors } = useTheme()

  return (
    <FileCard style={styles.card}>
      <FileCardHeader>
        <FileViewerToolbar wrapLines={wrapLines} onToggleWrap={onToggleWrap} onBack={onBack} />
        <View style={styles.headerCopy}>
          <FileCardTitle>Code Viewer</FileCardTitle>
          <FileCardDescription>
            {file
              ? 'Read-only source preview from the paired server.'
              : 'Select a file from the browser to preview it.'}
          </FileCardDescription>
        </View>
        {file ? <FileBreadcrumbs path={file.path} /> : null}
      </FileCardHeader>

      <FileCardContent style={styles.content}>
        {file ? renderPreview(file, content, isLoading, wrapLines, colors) : (
          <View style={[styles.emptyState, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No file selected</Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              Use the browser to open a source file.
            </Text>
          </View>
        )}
      </FileCardContent>
    </FileCard>
  )
}

function renderPreview(
  file: FileNode,
  content: string | null,
  isLoading: boolean,
  wrapLines: boolean,
  colors: ReturnType<typeof useTheme>['colors'],
) {
  if (isLoading) {
    return (
      <View style={[styles.emptyState, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Loading...</Text>
        <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
          Fetching {file.name} from the server.
        </Text>
      </View>
    )
  }

  const isSupported = file.language ? SUPPORTED_LANGUAGES.has(file.language) : false

  if (!isSupported || content == null) {
    return (
      <View style={[styles.emptyState, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Preview not available</Text>
        <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
          {file.name} cannot be previewed. The viewer supports TypeScript and JavaScript files.
        </Text>
      </View>
    )
  }

  const lines = content.split('\n')

  return (
    <ScrollView
      style={[styles.outerScroll, { backgroundColor: colors.backgroundSecondary }]}
      contentContainerStyle={styles.outerContent}
      showsVerticalScrollIndicator={false}
    >
      <ScrollView horizontal={!wrapLines} showsHorizontalScrollIndicator={!wrapLines}>
        <View style={[styles.codeContainer, wrapLines && styles.wrappedCodeContainer]}>
          {lines.map((line, index) => (
            <View key={`${file.id}-${index + 1}`} style={styles.lineRow}>
              <Text style={[styles.lineNumber, { color: colors.textTertiary }]}>
                {index + 1}
              </Text>
              <Text
                style={[
                  styles.codeLine,
                  { color: colors.text },
                  wrapLines ? styles.codeLineWrapped : styles.codeLineUnwrapped,
                ]}
              >
                {line || ' '}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 320,
  },
  headerCopy: {
    gap: spacing[1],
  },
  content: {
    flex: 1,
  },
  outerScroll: {
    flex: 1,
    borderRadius: borderRadius.lg,
    minHeight: 260,
  },
  outerContent: {
    padding: spacing[3],
    minHeight: '100%',
  },
  codeContainer: {
    gap: spacing[1],
    minWidth: '100%',
  },
  wrappedCodeContainer: {
    flex: 1,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  lineNumber: {
    width: 28,
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    lineHeight: 18,
    paddingTop: 1,
  },
  codeLine: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    lineHeight: 18,
    flexShrink: 1,
  },
  codeLineWrapped: {
    flex: 1,
  },
  codeLineUnwrapped: {
    minWidth: '100%',
  },
  emptyState: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[2],
    minHeight: 240,
    justifyContent: 'center',
  },
  emptyTitle: {
    ...typographyScale.base,
    fontWeight: '700',
  },
  emptyBody: {
    ...typographyScale.sm,
  },
})
