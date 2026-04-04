import React from 'react'
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { EnrichedMarkdownText } from 'react-native-enriched-markdown'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { FileCard, FileCardContent, FileCardDescription, FileCardHeader, FileCardTitle } from './FileCard'
import FileBreadcrumbs from './FileBreadcrumbs'
import FileViewerToolbar from './FileViewerToolbar'
import type { CodeLanguage, FileNode } from './model'

type Props = {
  file: FileNode | null
  content: string | null
  isLoading: boolean
  wrapLines: boolean
  onToggleWrap: () => void
  onBack?: () => void
  isContextSelected?: boolean
  onToggleContext?: () => void
}

const PREVIEWABLE_LANGUAGES = new Set([
  'typescript',
  'tsx',
  'javascript',
  'jsx',
  'python',
  'markdown',
  'rust',
  'json',
  'yaml',
  'toml',
  'shell',
  'html',
  'css',
  'sql',
  'text',
])

const HIGHLIGHTABLE_LANGUAGES = new Set([
  'typescript',
  'tsx',
  'javascript',
  'jsx',
  'python',
  'rust',
  'json',
  'shell',
])

export default function CodeViewer({
  file,
  content,
  isLoading,
  wrapLines,
  onToggleWrap,
  onBack,
  isContextSelected = false,
  onToggleContext,
}: Props) {
  const { colors } = useTheme()
  const [syntaxInfoVisible, setSyntaxInfoVisible] = React.useState(false)
  const showSyntaxInfo = file?.language ? HIGHLIGHTABLE_LANGUAGES.has(file.language) : false

  React.useEffect(() => {
    if (!showSyntaxInfo) {
      setSyntaxInfoVisible(false)
    }
  }, [showSyntaxInfo, file?.path])

  return (
    <FileCard style={styles.card}>
      <FileCardHeader>
        <FileViewerToolbar
          wrapLines={wrapLines}
          onToggleWrap={onToggleWrap}
          onBack={onBack}
          contextSelected={isContextSelected}
          onToggleContext={file ? onToggleContext : undefined}
          showSyntaxInfo={showSyntaxInfo}
          syntaxInfoVisible={syntaxInfoVisible}
          onToggleSyntaxInfo={() => setSyntaxInfoVisible((current) => !current)}
        />
        {showSyntaxInfo && syntaxInfoVisible ? (
          <View style={[styles.infoCallout, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
            <Text style={[styles.infoCalloutTitle, { color: colors.text }]}>Syntax colors</Text>
            <Text style={[styles.infoCalloutBody, { color: colors.textSecondary }]}>
              Highlighting here is intentionally lightweight and regex-based. It helps readability, but it is not parser-grade.
            </Text>
          </View>
        ) : null}
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

  const isSupported = file.language ? PREVIEWABLE_LANGUAGES.has(file.language) : false

  if (!isSupported || content == null) {
    return (
      <View style={[styles.emptyState, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Preview not available</Text>
        <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
          {file.name} cannot be previewed yet. The viewer currently supports common text-based files.
        </Text>
      </View>
    )
  }

  if (file.language === 'markdown') {
    return (
      <ScrollView
        style={[styles.outerScroll, { backgroundColor: colors.backgroundSecondary }]}
        contentContainerStyle={styles.markdownContent}
        showsVerticalScrollIndicator={false}
      >
        <EnrichedMarkdownText
          markdown={content}
          markdownStyle={{
            paragraph: { color: colors.text, fontSize: 14, lineHeight: 22 },
            h1: { color: colors.text, fontSize: 24, lineHeight: 30, fontWeight: '700' },
            h2: { color: colors.text, fontSize: 20, lineHeight: 26, fontWeight: '700' },
            h3: { color: colors.text, fontSize: 18, lineHeight: 24, fontWeight: '600' },
            blockquote: {
              color: colors.textSecondary,
              borderColor: colors.border,
              borderWidth: 1,
              gapWidth: spacing[3],
              backgroundColor: colors.surface,
            },
            list: { color: colors.text, fontSize: 14, lineHeight: 22 },
            codeBlock: {
              color: colors.text,
              backgroundColor: colors.surface,
              borderRadius: borderRadius.md,
              padding: spacing[3],
              fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
            },
            code: {
              color: colors.text,
              backgroundColor: colors.surface,
              fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
            },
            link: { color: colors.primary },
          }}
        />
      </ScrollView>
    )
  }

  const lines = content.split('\n')
  const shouldHighlight = file.language ? HIGHLIGHTABLE_LANGUAGES.has(file.language) : false

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
                {line
                  ? renderCodeLine(line, file.language ?? 'text', colors, shouldHighlight)
                  : ' '}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScrollView>
  )
}

function renderCodeLine(
  line: string,
  language: CodeLanguage,
  colors: ReturnType<typeof useTheme>['colors'],
  shouldHighlight: boolean,
) {
  if (!shouldHighlight) return line

  return tokenizeLine(line, language).map((segment, index) => (
    <Text key={`${language}-${index}`} style={{ color: colorForToken(segment.type, colors) }}>
      {segment.value}
    </Text>
  ))
}

function tokenizeLine(line: string, language: CodeLanguage): Array<{ value: string; type: TokenType }> {
  const rules = rulesForLanguage(language)
  const segments: Array<{ value: string; type: TokenType }> = []
  let rest = line

  while (rest.length > 0) {
    let matched = false

    for (const rule of rules) {
      const match = rest.match(rule.pattern)
      if (!match) continue
      segments.push({ value: match[0], type: rule.type })
      rest = rest.slice(match[0].length)
      matched = true
      break
    }

    if (!matched) {
      segments.push({ value: rest[0], type: 'plain' })
      rest = rest.slice(1)
    }
  }

  return segments
}

type TokenType = 'keyword' | 'string' | 'comment' | 'number' | 'plain'

function rulesForLanguage(language: CodeLanguage): Array<{ pattern: RegExp; type: TokenType }> {
  if (language === 'python') {
    return [
      { pattern: /^#.*/, type: 'comment' },
      { pattern: /^(?:'''|""")[\s\S]*/, type: 'string' },
      { pattern: /^(?:'(?:\\.|[^'])*'|"(?:\\.|[^"])*")/, type: 'string' },
      {
        pattern: /^(?:False|None|True|and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|if|import|in|is|lambda|match|nonlocal|not|or|pass|raise|return|try|while|with|yield)\b/,
        type: 'keyword',
      },
      { pattern: /^\b\d+(?:\.\d+)?\b/, type: 'number' },
    ]
  }

  if (language === 'rust') {
    return [
      { pattern: /^\/\/.*/, type: 'comment' },
      { pattern: /^(?:'(?:\\.|[^'])*'|"(?:\\.|[^"])*")/, type: 'string' },
      {
        pattern: /^(?:as|async|await|break|const|continue|crate|dyn|else|enum|extern|false|fn|for|if|impl|in|let|loop|match|mod|move|mut|pub|ref|return|self|Self|static|struct|trait|true|type|unsafe|use|where|while)\b/,
        type: 'keyword',
      },
      { pattern: /^\b\d+(?:\.\d+)?\b/, type: 'number' },
    ]
  }

  if (language === 'json') {
    return [
      { pattern: /^(?:"(?:\\.|[^"])*")(?=\s*:)/, type: 'keyword' },
      { pattern: /^(?:"(?:\\.|[^"])*")/, type: 'string' },
      { pattern: /^(?:true|false|null)\b/, type: 'keyword' },
      { pattern: /^\b-?\d+(?:\.\d+)?\b/, type: 'number' },
    ]
  }

  if (language === 'shell') {
    return [
      { pattern: /^#.*/, type: 'comment' },
      { pattern: /^(?:'(?:\\.|[^'])*'|"(?:\\.|[^"])*")/, type: 'string' },
      {
        pattern: /^(?:alias|case|cd|do|done|echo|elif|else|esac|export|fi|for|function|if|in|local|pwd|return|set|then|unset|while)\b/,
        type: 'keyword',
      },
      { pattern: /^\$\w+/, type: 'number' },
    ]
  }

  return [
    { pattern: /^\/\/.*/, type: 'comment' },
    { pattern: /^\/\*.*\*\/$/, type: 'comment' },
    { pattern: /^(?:`(?:\\.|[^`])*`|'(?:\\.|[^'])*'|"(?:\\.|[^"])*")/, type: 'string' },
    {
      pattern: /^(?:abstract|as|async|await|break|case|catch|class|const|continue|debugger|declare|default|delete|else|enum|export|extends|false|finally|for|from|function|if|implements|import|in|infer|instanceof|interface|let|new|null|private|protected|public|readonly|return|satisfies|static|super|switch|this|throw|true|try|type|typeof|undefined|var|void|while|yield)\b/,
      type: 'keyword',
    },
    { pattern: /^\b\d+(?:\.\d+)?\b/, type: 'number' },
  ]
}

function colorForToken(
  tokenType: TokenType,
  colors: ReturnType<typeof useTheme>['colors'],
): string {
  switch (tokenType) {
    case 'keyword':
      return colors.primary
    case 'string':
      return '#b45309'
    case 'comment':
      return colors.textTertiary
    case 'number':
      return '#7c3aed'
    default:
      return colors.text
  }
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 320,
  },
  headerCopy: {
    gap: spacing[1],
  },
  infoCallout: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[1],
  },
  infoCalloutTitle: {
    ...typographyScale.sm,
    fontWeight: '700',
  },
  infoCalloutBody: {
    ...typographyScale.sm,
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
  markdownContent: {
    padding: spacing[4],
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
