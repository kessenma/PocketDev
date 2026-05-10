import React, { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { CircleCheck, CircleX, Clock, Square } from 'lucide-react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../../../contexts/ThemeContext'
import { useTaskStore } from '../../../../stores/tasks'
import { typeStyles } from '../../../../theme/typography'
import type { Task } from '@pocketdev/shared/types'

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed': return <CircleCheck color="#22c55e" size={14} strokeWidth={2} />
    case 'failed': return <CircleX color="#ef4444" size={14} strokeWidth={2} />
    case 'killed': return <Square color="#737373" size={14} strokeWidth={2} />
    default: return <Clock color="#3b82f6" size={14} strokeWidth={2} />
  }
}

function ScriptRow({ item, borderColor }: { item: Task; borderColor: string }) {
  const { colors } = useTheme()
  const displayName = item.script_name ?? item.prompt

  return (
    <View style={[styles.row, { borderBottomColor: borderColor }]}>
      <View style={styles.rowLeft}>
        <StatusIcon status={item.status} />
        <View style={styles.rowText}>
          <Text style={[styles.scriptName, { color: colors.text }]} numberOfLines={1}>
            {displayName}
          </Text>
          {item.working_directory ? (
            <Text style={[styles.pkgPath, { color: colors.textTertiary }]} numberOfLines={1}>
              {item.working_directory}
            </Text>
          ) : null}
        </View>
      </View>
      <Text style={[styles.time, { color: colors.textTertiary }]}>
        {formatRelativeTime(item.created_at)}
      </Text>
    </View>
  )
}

export default function HistoryScripts() {
  const { colors } = useTheme()
  const tasks = useTaskStore((s) => s.tasks)

  const scriptHistory: Task[] = useMemo(
    () =>
      Array.from(tasks.values())
        .filter((t) => t.agent_type === 'shell')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [tasks],
  )

  if (scriptHistory.length === 0) {
    return (
      <View style={[styles.emptyCard, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No script history</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Run a script to see its history here.
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.list}>
      {scriptHistory.map((item) => (
        <ScriptRow key={item.id} item={item} borderColor={colors.border} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  list: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[1],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flex: 1,
    minWidth: 0,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  scriptName: {
    ...typeStyles.bodyBold,
  },
  pkgPath: {
    ...typeStyles.meta,
    marginTop: 2,
  },
  time: {
    ...typeStyles.meta,
    flexShrink: 0,
    marginLeft: spacing[2],
  },
  emptyCard: {
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    gap: spacing[2],
  },
  emptyTitle: {
    ...typeStyles.bodyBold,
  },
  emptySubtitle: {
    ...typeStyles.bodySmall,
    textAlign: 'center',
  },
})
