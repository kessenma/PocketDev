import React, { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../../../contexts/ThemeContext'
import { usePreviewStore } from '../../../../stores/preview'
import { useScriptsStore } from '../../../../stores/scripts'
import { useTaskStore } from '../../../../stores/tasks'
import ScriptCard from '../../../scripts/ScriptCard'
import SuggestedGroupAccordion from '../../../scripts/SuggestedGroupAccordion'
import { getGroupedSuggestedActions, getSuggestedActions } from '../../../scripts/model'
import type { MonorepoContext } from '../../../scripts/model'
import { typeStyles } from '../../../../theme/typography'

const emptyLines: string[] = []

export default function SuggestedScripts() {
  const { colors } = useTheme()
  const packages = useScriptsStore((s) => s.packages)
  const selectedPackageIndex = useScriptsStore((s) => s.selectedPackageIndex)
  const runningScripts = useScriptsStore((s) => s.runningScripts)
  const runCommand = useScriptsStore((s) => s.runCommand)
  const stopScript = useScriptsStore((s) => s.stopScript)
  const dismissScript = useScriptsStore((s) => s.dismissScript)
  const openPreview = usePreviewStore((s) => s.openPreview)
  const taskLogs = useTaskStore((s) => s.taskLogs)
  const sendInput = useTaskStore((s) => s.sendInput)

  const selectedPkg = packages[selectedPackageIndex] ?? null
  const isMonorepo = packages.length > 1
  const isMonorepoRoot = isMonorepo && selectedPkg?.path === '.'

  const suggestedGroups = useMemo(() => {
    if (!selectedPkg || !isMonorepoRoot) return []
    const workspacePkgs = packages.filter((p) => p.path !== '.')
    return getGroupedSuggestedActions(selectedPkg.packageManager, workspacePkgs)
  }, [selectedPkg, isMonorepoRoot, packages])

  const suggestedActions = useMemo(() => {
    if (!selectedPkg || isMonorepoRoot) return []
    const monorepo: MonorepoContext | undefined =
      isMonorepo && selectedPkg.path !== '.'
        ? { packageName: selectedPkg.name, packagePath: selectedPkg.path }
        : undefined
    return getSuggestedActions(selectedPkg.packageManager, monorepo)
  }, [selectedPkg, isMonorepo, isMonorepoRoot])

  function getOutputLines(taskId: string | undefined): string[] {
    if (!taskId) return emptyLines
    return taskLogs.get(taskId) ?? emptyLines
  }

  if (isMonorepoRoot) {
    return (
      <View style={styles.scriptList}>
        {suggestedGroups.map((group) => (
          <SuggestedGroupAccordion
            key={group.id}
            group={group}
            runningScripts={runningScripts}
            onRun={(target) => runCommand(target.packagePath, target.id, target.command, target.useRootCwd, target.label)}
            onStop={stopScript}
          />
        ))}
      </View>
    )
  }

  if (suggestedActions.length > 0) {
    return (
      <View style={styles.scriptList}>
        {suggestedActions.map((action) => {
          const key = `${selectedPkg!.path}:${action.id}`
          const running = runningScripts.get(key)
          return (
            <ScriptCard
              key={action.id}
              name={action.label}
              command={action.resolvedCommand}
              status={running?.status ?? null}
              detectedPort={running?.detectedPort ?? null}
              outputLines={getOutputLines(running?.taskId)}
              onRun={() => runCommand(selectedPkg!.path, action.id, action.resolvedCommand, action.useRootCwd, action.label)}
              onStop={() => stopScript(key)}
              onDismiss={() => dismissScript(key)}
              onPreview={(port) => openPreview(`http://localhost:${port}`)}
              onSendInput={running?.taskId ? (text) => sendInput(running.taskId!, text) : undefined}
            />
          )
        })}
      </View>
    )
  }

  return (
    <View style={[styles.emptyCard, { backgroundColor: colors.backgroundSecondary }]}>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No suggested actions</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        This package manager does not have any quick actions configured yet.
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
