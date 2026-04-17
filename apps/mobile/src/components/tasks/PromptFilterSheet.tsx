import React, { useEffect, useRef } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { X, Cpu } from 'lucide-react-native'
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { typeStyles } from '../../theme/typography'
import { useOnDeviceAIStore } from '../../stores/on-device-ai'
import { useFilesStore } from '../../stores/files'
import { getExtension } from '../../services/file-context-suggester'
import { pathToName } from '../files/model'

// ─── Phrase segmentation ────────────────────────────────────────────────────

/**
 * Splits a prompt into short, meaningful phrase chips.
 * Avoids breaking on periods inside identifiers (e.g. "Tasks.tsx").
 */
export function segmentPrompt(text: string): string[] {
  // Split on sentence-ending punctuation (period before whitespace/end), !, ?, newlines, commas, semicolons
  const clauses = text
    .split(/[!?\n,;]|\.(?=\s|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2)

  const segments: string[] = []
  for (const clause of clauses) {
    const words = clause.split(/\s+/).filter(Boolean)
    if (words.length <= 5) {
      segments.push(clause)
    } else {
      // Break long clauses into 3-word chunks
      for (let i = 0; i < words.length; i += 3) {
        const chunk = words.slice(i, i + 3).join(' ')
        if (chunk.trim().length >= 2) segments.push(chunk)
      }
    }
  }

  // Dedupe, drop anything under 2 chars
  return [...new Set(segments)].filter((s) => s.trim().length >= 2)
}

// ─── Extension icon colours (mirrors AISuggestions palette) ─────────────────

const EXT_COLORS: Record<string, string> = {
  ts: '#3178C6', tsx: '#3178C6',
  js: '#D4A017', jsx: '#D4A017',
  py: '#3776AB', rs: '#A0522D',
  go: '#00ADD8', rb: '#CC342D',
  java: '#5382A1', kt: '#7F52FF',
  swift: '#F05138', html: '#E34F26',
  css: '#663399', scss: '#663399',
  md: '#757575', json: '#757575',
  yaml: '#757575', yml: '#757575',
  sql: '#336791', sh: '#4EAA25',
}

const EXT_MDI: Record<string, string> = {
  ts: 'language-typescript', tsx: 'language-typescript',
  js: 'language-javascript', jsx: 'language-javascript',
  py: 'language-python', rs: 'language-rust',
  go: 'language-go', rb: 'language-ruby',
  java: 'language-java', kt: 'language-kotlin',
  swift: 'language-swift', html: 'language-html5',
  css: 'language-css3', scss: 'language-css3',
  md: 'language-markdown', json: 'code-json',
  yaml: 'file-cog-outline', yml: 'file-cog-outline',
  sql: 'database', sh: 'console',
}

function ExtIcon({ ext, size, color }: { ext: string; size: number; color: string }) {
  const mdi = EXT_MDI[ext]
  if (!mdi) return null
  return <MaterialDesignIcons name={mdi as any} size={size} color={color} />
}

// ─── File result chip ────────────────────────────────────────────────────────

function FileResultChip({ path, onPin, pinned }: { path: string; onPin: () => void; pinned: boolean }) {
  const { colors } = useTheme()
  const ext = getExtension(path)
  const color = EXT_COLORS[ext] ?? colors.textSecondary
  const name = pathToName(path)
  const stem = ext ? name.replace(`.${ext}`, '') : name

  return (
    <TouchableOpacity
      style={[
        styles.fileChip,
        {
          borderColor: pinned ? color + '70' : colors.border,
          backgroundColor: pinned ? color + '12' : colors.panelAlt,
        },
      ]}
      onPress={onPin}
      activeOpacity={0.7}
    >
      <ExtIcon ext={ext} size={13} color={color} />
      <Text style={[styles.fileChipText, { color: pinned ? color : colors.text }]} numberOfLines={1}>
        {stem}
      </Text>
      {ext ? (
        <Text style={[styles.fileChipExt, { color: (pinned ? color : colors.textTertiary) + 'BB' }]}>
          .{ext}
        </Text>
      ) : null}
    </TouchableOpacity>
  )
}

// ─── Main sheet ──────────────────────────────────────────────────────────────

type Props = {
  prompt: string
  onDismiss: () => void
  onSearch: (phrase: string) => Promise<void>
}

export default function PromptFilterSheet({ prompt, onDismiss, onSearch }: Props) {
  const { colors } = useTheme()
  const sheetRef = useRef<TrueSheet>(null)
  const suggestions = useOnDeviceAIStore((s) => s.suggestions)
  const restSuggestions = useOnDeviceAIStore((s) => s.restSuggestions)
  const clearSuggestions = useOnDeviceAIStore((s) => s.clearSuggestions)
  const toggleContextPath = useFilesStore((s) => s.toggleContextPath)
  const selectedContextPaths = useFilesStore((s) => s.selectedContextPaths)

  const [activePhrase, setActivePhrase] = React.useState<string | null>(null)
  const [searching, setSearching] = React.useState(false)

  const phrases = React.useMemo(() => segmentPrompt(prompt), [prompt])
  const allResults = React.useMemo(
    () => [...suggestions, ...restSuggestions],
    [suggestions, restSuggestions],
  )

  useEffect(() => {
    sheetRef.current?.present()
  }, [])

  async function handlePhrasePress(phrase: string) {
    setActivePhrase(phrase)
    setSearching(true)
    clearSuggestions()
    try {
      await onSearch(phrase)
    } finally {
      setSearching(false)
    }
  }

  return (
    <TrueSheet ref={sheetRef} detents={['auto']} backgroundColor={colors.background} cornerRadius={24} onDidDismiss={onDismiss}>
      <View>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerLeft}>
            <Cpu color={colors.primary} size={16} strokeWidth={2.2} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>Focus Search</Text>
          </View>
          <TouchableOpacity onPress={() => sheetRef.current?.dismiss()} activeOpacity={0.7} style={styles.closeButton}>
            <X color={colors.textSecondary} size={22} strokeWidth={2.25} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {/* Phrase chips */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              Tap a phrase to find related files
            </Text>
            {phrases.length > 0 ? (
              <View style={styles.phraseRow}>
                {phrases.map((phrase) => {
                  const active = phrase === activePhrase
                  return (
                    <TouchableOpacity
                      key={phrase}
                      style={[
                        styles.phraseChip,
                        {
                          borderColor: active ? colors.primary : colors.border,
                          backgroundColor: active ? colors.primary + '18' : colors.panelAlt,
                        },
                      ]}
                      onPress={() => handlePhrasePress(phrase)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.phraseChipText,
                          { color: active ? colors.primary : colors.text },
                        ]}
                      >
                        {phrase}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            ) : (
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                Type a prompt above to get phrase suggestions.
              </Text>
            )}
          </View>

          {/* Results */}
          {activePhrase ? (
            <View style={styles.section}>
              <View style={styles.resultsHeader}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  Results for{' '}
                  <Text style={{ color: colors.primary }}>"{activePhrase}"</Text>
                </Text>
                {searching && (
                  <ActivityIndicator size="small" color={colors.primary} />
                )}
              </View>

              {!searching && allResults.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                  No closely related files found.
                </Text>
              ) : null}

              {!searching && allResults.length > 0 ? (
                <View style={styles.fileRow}>
                  {allResults.map((s) => (
                    <FileResultChip
                      key={s.path}
                      path={s.path}
                      pinned={selectedContextPaths.includes(s.path)}
                      onPin={() => toggleContextPath(s.path)}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </View>
    </TrueSheet>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  headerTitle: {
    ...typeStyles.screenTitle,
  },
  closeButton: {
    padding: spacing[2],
  },
  body: {
    padding: spacing[4],
    gap: spacing[5],
  },
  section: {
    gap: spacing[3],
  },
  sectionLabel: {
    ...typeStyles.labelStrong,
  },
  phraseRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  phraseChip: {
    borderWidth: 2,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  phraseChipText: {
    ...typeStyles.bodySmall,
    fontWeight: '600',
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fileRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  fileChipText: {
    ...typeStyles.meta,
    fontWeight: '600',
    flexShrink: 1,
    maxWidth: 160,
  },
  fileChipExt: {
    ...typeStyles.meta,
    fontSize: 10,
    fontWeight: '500',
  },
  emptyText: {
    ...typeStyles.bodySmall,
    textAlign: 'center',
    paddingVertical: spacing[4],
  },
})
