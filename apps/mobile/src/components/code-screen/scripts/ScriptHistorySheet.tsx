import React, { useCallback, useMemo, useRef, useState } from 'react'
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native'
import { Sheet, type SheetHandle } from '../../ui/Sheet'
import { CircleCheck, CircleX, Clock, History, Square, X } from 'lucide-react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../../contexts/ThemeContext'
import { useTaskStore } from '../../../stores/tasks'
import { typeStyles } from '../../../theme/typography'
import type { Task } from '@pocketdev/shared/types'

type Props = {
  onDismiss: () => void
}

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

const CHROME_HEIGHT = 60

export default function ScriptHistorySheet({ onDismiss }: Props) {
  const { colors } = useTheme()
  const { height: windowHeight } = useWindowDimensions()
  const sheetRef = useRef<SheetHandle>(null)
  const tasks = useTaskStore((s) => s.tasks)
  const [listHeight, setListHeight] = useState(Math.max(windowHeight * 0.5 - CHROME_HEIGHT, 120))

  const updateListHeight = useCallback((position: number) => {
    setListHeight(Math.max(windowHeight - position - CHROME_HEIGHT, 120))
  }, [windowHeight])

  const scriptHistory: Task[] = useMemo(
    () =>
      Array.from(tasks.values())
        .filter((t) => t.agent_type === 'shell')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [tasks],
  )

  return (
    <Sheet
      ref={sheetRef}
      detents={[0.5, 1]}
      onDismiss={onDismiss}
      onDidPresent={({ nativeEvent }) => updateListHeight(nativeEvent.position)}
      onDetentChange={({ nativeEvent }) => updateListHeight(nativeEvent.position)}
    >
      <View style={styles.container}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerLeft}>
            <History color={colors.primary} size={16} strokeWidth={2.2} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>Script History</Text>
          </View>
          <TouchableOpacity
            onPress={() => sheetRef.current?.dismiss()}
            style={styles.closeButton}
            activeOpacity={0.7}
          >
            <X color={colors.textSecondary} size={22} strokeWidth={2.25} />
          </TouchableOpacity>
        </View>

        {scriptHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              No script runs yet.
            </Text>
          </View>
        ) : (
          <FlatList
            data={scriptHistory}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ScriptRow item={item} borderColor={colors.border} />
            )}
            style={{ height: listHeight }}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  headerTitle: {
    ...typeStyles.bodyBold,
  },
  closeButton: {
    padding: spacing[1],
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing[8],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
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
  emptyState: {
    padding: spacing[6],
    alignItems: 'center',
  },
  emptyText: {
    ...typeStyles.bodySmall,
  },
})
