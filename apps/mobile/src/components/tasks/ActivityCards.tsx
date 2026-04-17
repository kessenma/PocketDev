import React, { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import {
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Circle,
  FileEdit,
  FileSearch,
  ListChecks,
  ListTodo,
  Loader,
  Sparkles,
  Terminal,
} from 'lucide-react-native'
import { EnrichedMarkdownText } from 'react-native-enriched-markdown'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { palette } from '@pocketdev/shared/theme'
import type { TaskActivity } from '@pocketdev/shared/types'
import { useTheme } from '../../contexts/ThemeContext'
import { typeStyles } from '../../theme/typography'
import {
  BauhausPanel,
  BauhausPanelContent,
  BauhausPanelHeader,
} from '../shared/BauhausPanel'
import BauhausBadge from '../shared/BauhausBadge'
import { getToolPresentation } from './task-stream-utils'
import type { CardCategory, CardEntry, GroupedStreamItem, TodoItem } from './task-stream-utils'
import FileViewerSheet from './FileViewerSheet'

// ── Dispatcher ───────────────────────────────────────────────────────────────

export function GroupedItemRow({ item }: { item: GroupedStreamItem }) {
  const { colors } = useTheme()

  switch (item.kind) {
    case 'card':
      return <ActivityCard category={item.category} entries={item.entries} />
    case 'checklist':
      return <ChecklistCard todos={item.todos} />
    case 'result':
      return <ResultCard activity={item.activity} />
    case 'status':
      return (
        <View style={styles.statusRow}>
          <BauhausBadge label={item.activity.message} color={colors.primary} />
        </View>
      )
    case 'log':
      return <LogLine line={item.line} />
  }
}

// ── Category metadata ─────────────────────────────────────────────────────────

type CategoryMeta = {
  label: string
  Icon: React.ComponentType<{ color: string; size: number; strokeWidth: number; style?: any }>
  getColor: (colors: any) => string
}

const CATEGORY_META: Record<CardCategory, CategoryMeta> = {
  researching: {
    label: 'Researching',
    Icon: FileSearch,
    getColor: (colors) => colors.accentBlue ?? palette.bauhaus.blue,
  },
  writing: {
    label: 'Writing',
    Icon: FileEdit,
    getColor: (colors) => colors.accentYellow ?? palette.bauhaus.yellow,
  },
  planning: {
    label: 'Planning',
    Icon: ListTodo,
    getColor: (colors) => colors.primary,
  },
  running: {
    label: 'Running',
    Icon: Terminal,
    getColor: (colors) => colors.accentGreen ?? palette.success[500],
  },
}

// ── ActivityCard ──────────────────────────────────────────────────────────────

function ActivityCard({ category, entries }: { category: CardCategory; entries: CardEntry[] }) {
  const { colors } = useTheme()
  const [isExpanded, setIsExpanded] = useState(true)

  const meta = CATEGORY_META[category]
  const accentColor = meta.getColor(colors)
  const { Icon } = meta

  return (
    <BauhausPanel accentColor={accentColor}>
      <Pressable onPress={() => setIsExpanded((v) => !v)} accessibilityRole="button">
        <BauhausPanelHeader style={styles.cardHeader}>
          <Icon color={accentColor} size={14} strokeWidth={2.25} />
          <Text style={[styles.cardTitle, { color: accentColor }]}>{meta.label}</Text>
          <BauhausBadge label={String(entries.length)} color={accentColor} />
          <View style={styles.chevronSpacer} />
          {isExpanded
            ? <ChevronUp color={colors.textTertiary} size={14} strokeWidth={2.25} />
            : <ChevronDown color={colors.textTertiary} size={14} strokeWidth={2.25} />
          }
        </BauhausPanelHeader>
      </Pressable>

      {isExpanded && (
        <BauhausPanelContent style={styles.cardBody}>
          {entries.map((entry, i) => (
            <CardEntryRow key={i} entry={entry} accentColor={accentColor} />
          ))}
        </BauhausPanelContent>
      )}
    </BauhausPanel>
  )
}

// ── CardEntryRow ──────────────────────────────────────────────────────────────

function CardEntryRow({ entry, accentColor }: { entry: CardEntry; accentColor: string }) {
  const { colors } = useTheme()
  const [sheetOpen, setSheetOpen] = useState(false)

  if (entry.kind === 'thinking') {
    return (
      <View style={styles.entryRow}>
        <Brain size={12} color={colors.textTertiary} strokeWidth={2.25} />
        <Text style={[styles.thinkingText, { color: colors.textTertiary }]} numberOfLines={3}>
          {entry.preview}
        </Text>
      </View>
    )
  }

  const presentation = getToolPresentation(entry.toolUse)
  const isFileTappable =
    entry.toolUse.filePath != null &&
    (presentation.kind === 'read' || presentation.kind === 'write' || presentation.kind === 'create')

  const resultPreview = entry.toolResult?.preview
  const isResultError = entry.toolResult?.isError

  const rowContent = (
    <>
      <View style={styles.entryRow}>
        <Text style={[styles.entryLabel, { color: accentColor }]}>{presentation.label}</Text>
        <Text style={[styles.entryDetail, { color: colors.text }]} numberOfLines={1} ellipsizeMode="middle">
          {presentation.detail}
        </Text>
        {isFileTappable && (
          <ChevronRight size={12} color={colors.textTertiary} strokeWidth={2.25} />
        )}
      </View>
      {resultPreview ? (
        <Text
          style={[
            styles.resultPreview,
            { color: isResultError ? (colors.accentRed ?? palette.error[500]) : colors.textTertiary },
          ]}
          numberOfLines={2}
        >
          {isResultError ? '[error] ' : ''}{resultPreview}
        </Text>
      ) : null}
    </>
  )

  return (
    <>
      {isFileTappable ? (
        <Pressable onPress={() => setSheetOpen(true)} accessibilityRole="button">
          {rowContent}
        </Pressable>
      ) : (
        rowContent
      )}
      {sheetOpen && entry.toolUse.filePath && (
        <FileViewerSheet
          filePath={entry.toolUse.filePath}
          activity={entry.toolUse}
          onDismiss={() => setSheetOpen(false)}
        />
      )}
    </>
  )
}

// ── ChecklistCard ─────────────────────────────────────────────────────────────

function ChecklistCard({ todos }: { todos: TodoItem[] }) {
  const { colors } = useTheme()
  const [isExpanded, setIsExpanded] = useState(true)

  const done = todos.filter((t) => t.status === 'completed').length
  const accentColor = colors.primary

  return (
    <BauhausPanel accentColor={accentColor}>
      <Pressable onPress={() => setIsExpanded((v) => !v)} accessibilityRole="button">
        <BauhausPanelHeader style={styles.cardHeader}>
          <ListChecks color={accentColor} size={14} strokeWidth={2.25} />
          <Text style={[styles.cardTitle, { color: accentColor }]}>Tasks</Text>
          <BauhausBadge label={`${done} / ${todos.length}`} color={accentColor} />
          <View style={styles.chevronSpacer} />
          {isExpanded
            ? <ChevronUp color={colors.textTertiary} size={14} strokeWidth={2.25} />
            : <ChevronDown color={colors.textTertiary} size={14} strokeWidth={2.25} />}
        </BauhausPanelHeader>
      </Pressable>

      {isExpanded && (
        <BauhausPanelContent style={styles.cardBody}>
          {todos.map((todo) => {
            const isComplete = todo.status === 'completed'
            const isActive = todo.status === 'in_progress'
            const textColor = isComplete ? colors.textTertiary : colors.text

            return (
              <View key={todo.id} style={styles.checklistRow}>
                {isComplete
                  ? <CheckCircle2 color={accentColor} size={13} strokeWidth={2.25} style={styles.checklistIcon} />
                  : isActive
                    ? <Loader color={accentColor} size={13} strokeWidth={2.25} style={styles.checklistIcon} />
                    : <Circle color={colors.textTertiary} size={13} strokeWidth={2.25} style={styles.checklistIcon} />}
                <Text
                  style={[
                    styles.checklistText,
                    { color: textColor },
                    isComplete && styles.checklistTextDone,
                  ]}
                  numberOfLines={2}
                >
                  {todo.content}
                </Text>
              </View>
            )
          })}
        </BauhausPanelContent>
      )}
    </BauhausPanel>
  )
}

// ── ResultCard ────────────────────────────────────────────────────────────────

function ResultCard({ activity }: { activity: Extract<TaskActivity, { type: 'text' }> }) {
  const { colors } = useTheme()
  const amber = palette.warning[500]

  return (
    <BauhausPanel accentColor={amber}>
      <BauhausPanelHeader style={styles.cardHeader}>
        <Sparkles color={amber} size={14} strokeWidth={2.25} />
        <Text style={[styles.cardTitle, { color: amber }]}>Result</Text>
      </BauhausPanelHeader>
      <BauhausPanelContent>
        <EnrichedMarkdownText
          markdown={activity.content}
          streamingAnimation
          markdownStyle={{
            paragraph: { color: colors.text, fontSize: 14, lineHeight: 20 },
            strong: { color: colors.text },
            link: { color: colors.primary },
            code: { color: colors.primary, backgroundColor: colors.panelAlt },
          }}
        />
      </BauhausPanelContent>
    </BauhausPanel>
  )
}

// ── LogLine (inlined to avoid circular import with TaskStreamer) ──────────────

function LogLine({ line }: { line: string }) {
  const { colors } = useTheme()
  return (
    <Text style={[styles.logLine, { color: colors.text }]}>{line}</Text>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  statusRow: {
    paddingVertical: spacing[2],
    alignItems: 'flex-start',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  cardTitle: {
    ...typeStyles.meta,
    fontWeight: '700',
  },
  chevronSpacer: {
    flex: 1,
  },
  cardBody: {
    gap: spacing[2],
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  entryLabel: {
    ...typeStyles.meta,
    fontWeight: '600',
    flexShrink: 0,
  },
  entryDetail: {
    ...typeStyles.bodySmall,
    flex: 1,
  },
  thinkingText: {
    ...typeStyles.bodySmall,
    fontStyle: 'italic',
    flex: 1,
  },
  resultPreview: {
    ...typeStyles.mono,
    fontSize: 11,
    marginLeft: spacing[2],
    marginTop: 2,
  },
  logLine: {
    ...typeStyles.mono,
    paddingVertical: 1,
    maxWidth: 900,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  checklistIcon: {
    flexShrink: 0,
    marginTop: 1,
  },
  checklistText: {
    ...typeStyles.bodySmall,
    flex: 1,
  },
  checklistTextDone: {
    textDecorationLine: 'line-through',
  },
})
