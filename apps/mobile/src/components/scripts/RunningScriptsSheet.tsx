import React, { useRef, useEffect } from 'react'
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { X, Square, Eye, Terminal } from 'lucide-react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { useScriptsStore, type RunningScript } from '../../stores/scripts'
import { usePreviewStore } from '../../stores/preview'
import { useTaskStore } from '../../stores/tasks'
import { typeStyles } from '../../theme/typography'

interface Props {
  onDismiss: () => void
}

export default function RunningScriptsSheet({ onDismiss }: Props) {
  const { colors } = useTheme()
  const sheetRef = useRef<TrueSheet>(null)
  const runningScripts = useScriptsStore((s) => s.runningScripts)
  const stopScript = useScriptsStore((s) => s.stopScript)
  const openPreview = usePreviewStore((s) => s.openPreview)
  const taskLogs = useTaskStore((s) => s.taskLogs)

  useEffect(() => {
    sheetRef.current?.present()
  }, [])

  async function handlePreview(url: string) {
    void openPreview(url)
    sheetRef.current?.dismiss()
  }

  const entries = Array.from(runningScripts.entries()).filter(
    ([, s]) => s.status === 'starting' || s.status === 'running',
  )

  return (
    <TrueSheet
      ref={sheetRef}
      detents={[0.6, 1]}
      backgroundColor={colors.panel}
      cornerRadius={24}
      onDidDismiss={onDismiss}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Terminal color={colors.primary} size={18} strokeWidth={2.25} />
          <Text style={[styles.title, { color: colors.text }]}>Running Scripts</Text>
        </View>
        <TouchableOpacity onPress={() => sheetRef.current?.dismiss()} style={styles.closeButton} activeOpacity={0.7}>
          <X color={colors.text} size={20} strokeWidth={2.25} />
        </TouchableOpacity>
      </View>

      {entries.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No scripts are running.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {entries.map(([key, script]) => (
            <RunningScriptRow
              key={key}
              scriptKey={key}
              script={script}
              lastLines={getLastLines(taskLogs, script.taskId, 3)}
              onStop={stopScript}
              onPreview={handlePreview}
            />
          ))}
        </ScrollView>
      )}
    </TrueSheet>
  )
}

function getLastLines(taskLogs: Map<string, string[]>, taskId: string, count: number): string[] {
  if (!taskId) return []
  const logs = taskLogs.get(taskId)
  if (!logs) return []
  return logs.slice(-count)
}

function RunningScriptRow({
  scriptKey,
  script,
  lastLines,
  onStop,
  onPreview,
}: {
  scriptKey: string
  script: RunningScript
  lastLines: string[]
  onStop: (key: string) => void
  onPreview: (targetUrl: string) => Promise<void>
}) {
  const { colors } = useTheme()

  return (
    <View style={[styles.row, { backgroundColor: colors.backgroundSecondary }]}>
      <View style={styles.rowHeader}>
        <View style={styles.rowInfo}>
          <View style={styles.nameRow}>
            <View style={[styles.liveDot, { backgroundColor: '#22c55e' }]} />
            <Text style={[styles.scriptName, { color: colors.text }]}>{script.scriptName}</Text>
          </View>
          <Text style={[styles.scriptPath, { color: colors.textTertiary }]}>
            {script.packagePath === '.' ? 'root' : script.packagePath}
          </Text>
        </View>

        <View style={styles.rowActions}>
          {script.detectedPort != null && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onPreview(`http://localhost:${script.detectedPort}`)}
              style={[styles.previewButton, { backgroundColor: colors.accentBlue }]}
            >
              <Eye color={colors.primaryText} size={14} strokeWidth={2.5} />
              <Text style={[styles.previewText, { color: colors.primaryText }]}>
                :{script.detectedPort}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onStop(scriptKey)}
            style={[styles.stopButton, { backgroundColor: colors.accentRed }]}
          >
            <Square color={colors.primaryText} size={14} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      {lastLines.length > 0 && (
        <View style={[styles.outputPreview, { backgroundColor: colors.background }]}>
          {lastLines.map((line, i) => (
            <Text
              key={i}
              style={[styles.outputLine, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {line}
            </Text>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  title: {
    ...typeStyles.bodyBold,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    padding: spacing[5],
    alignItems: 'center',
  },
  emptyText: {
    ...typeStyles.bodySmall,
  },
  list: {
    padding: spacing[4],
    gap: spacing[3],
  },
  row: {
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[3],
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scriptName: {
    ...typeStyles.bodyBold,
  },
  scriptPath: {
    ...typeStyles.meta,
    marginLeft: 8 + spacing[2], // offset past the dot
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[2],
    height: 34,
  },
  previewText: {
    ...typeStyles.meta,
  },
  stopButton: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outputPreview: {
    borderRadius: borderRadius.md,
    padding: spacing[2],
  },
  outputLine: {
    ...typeStyles.mono,
  },
})
