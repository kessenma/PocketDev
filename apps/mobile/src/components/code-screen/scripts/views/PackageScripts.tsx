import React, { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../../../contexts/ThemeContext'
import { usePreviewStore } from '../../../../stores/preview'
import { useScriptsStore } from '../../../../stores/scripts'
import { useTaskStore } from '../../../../stores/tasks'
import ScriptCard from '../../../scripts/ScriptCard'
import { CATEGORY_LABELS, categorizeScripts, groupByCategory } from '../../../scripts/model'
import type { CategorizedScript, ScriptCategory } from '../../../scripts/model'
import { typeStyles } from '../../../../theme/typography'

const emptyLines: string[] = []

export default function PackageScripts() {
  const { colors } = useTheme()
  const packages = useScriptsStore((s) => s.packages)
  const selectedPackageIndex = useScriptsStore((s) => s.selectedPackageIndex)
  const runningScripts = useScriptsStore((s) => s.runningScripts)
  const runScript = useScriptsStore((s) => s.runScript)
  const stopScript = useScriptsStore((s) => s.stopScript)
  const dismissScript = useScriptsStore((s) => s.dismissScript)
  const openPreview = usePreviewStore((s) => s.openPreview)
  const taskLogs = useTaskStore((s) => s.taskLogs)
  const sendInput = useTaskStore((s) => s.sendInput)

  const selectedPkg = packages[selectedPackageIndex] ?? null

  const grouped = useMemo(() => {
    if (!selectedPkg) return new Map()
    return groupByCategory(categorizeScripts(selectedPkg.scripts))
  }, [selectedPkg])

  function getOutputLines(taskId: string | undefined): string[] {
    if (!taskId) return emptyLines
    return taskLogs.get(taskId) ?? emptyLines
  }

  return (
    <>
      {Array.from(grouped.entries()).map(([category, scripts]) => (
        <View key={category} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>
            {CATEGORY_LABELS[category as ScriptCategory]}
          </Text>
          <View style={styles.scriptList}>
            {scripts.map((script: CategorizedScript) => {
              const key = `${selectedPkg!.path}:${script.name}`
              const running = runningScripts.get(key)
              return (
                <ScriptCard
                  key={script.name}
                  name={script.name}
                  command={script.command}
                  status={running?.status ?? null}
                  detectedPort={running?.detectedPort ?? null}
                  outputLines={getOutputLines(running?.taskId)}
                  onRun={() => runScript(selectedPkg!.path, script.name)}
                  onStop={() => stopScript(key)}
                  onDismiss={() => dismissScript(key)}
                  onPreview={(port) => openPreview(`http://localhost:${port}`)}
                  onSendInput={running?.taskId ? (text) => sendInput(running.taskId!, text) : undefined}
                />
              )
            })}
          </View>
        </View>
      ))}
    </>
  )
}

const styles = StyleSheet.create({
  section: {
    gap: spacing[2],
  },
  sectionTitle: {
    ...typeStyles.sectionTitle,
  },
  scriptList: {
    gap: spacing[2],
  },
})
