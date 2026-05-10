import React, { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../../../contexts/ThemeContext'
import { usePreviewStore } from '../../../../stores/preview'
import { useScriptsStore } from '../../../../stores/scripts'
import { useTaskStore } from '../../../../stores/tasks'
import ScriptCard from '../../../scripts/ScriptCard'
import { typeStyles } from '../../../../theme/typography'

const emptyLines: string[] = []

export default function RunningScripts() {
  const { colors } = useTheme()
  const runningScripts = useScriptsStore((s) => s.runningScripts)
  const stopScript = useScriptsStore((s) => s.stopScript)
  const dismissScript = useScriptsStore((s) => s.dismissScript)
  const openPreview = usePreviewStore((s) => s.openPreview)
  const taskLogs = useTaskStore((s) => s.taskLogs)
  const sendInput = useTaskStore((s) => s.sendInput)

  const runningEntries = useMemo(
    () => Array.from(runningScripts.entries()),
    [runningScripts],
  )

  function getOutputLines(taskId: string | undefined): string[] {
    if (!taskId) return emptyLines
    return taskLogs.get(taskId) ?? emptyLines
  }

  if (runningEntries.length > 0) {
    return (
      <View style={styles.scriptList}>
        {runningEntries.map(([key, entry]) => (
          <ScriptCard
            key={key}
            name={entry.scriptName}
            command={entry.packagePath === '.' ? 'workspace root' : entry.packagePath}
            status={entry.status}
            detectedPort={entry.detectedPort}
            outputLines={getOutputLines(entry.taskId)}
            onRun={() => {}}
            onStop={() => stopScript(key)}
            onDismiss={() => dismissScript(key)}
            onPreview={(port) => openPreview(`http://localhost:${port}`)}
            onSendInput={entry.taskId ? (text) => sendInput(entry.taskId!, text) : undefined}
          />
        ))}
      </View>
    )
  }

  return (
    <View style={[styles.emptyCard, { backgroundColor: colors.backgroundSecondary }]}>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No running scripts</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Start a script from the Scripts or Suggested tabs to see its live output here.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  scriptList: {
    gap: spacing[2],
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
