import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { ChevronDown, ChevronUp, Terminal, Wrench } from 'lucide-react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { useScriptsStore } from '../../stores/scripts'
import { useTaskStore } from '../../stores/tasks'
import { usePreviewStore } from '../../stores/preview'
import { categorizeScripts, groupByCategory, getSuggestedActions, CATEGORY_LABELS } from './model'
import type { CategorizedScript, ScriptCategory } from './model'
import PackageSelector from './PackageSelector'
import ScriptCard from './ScriptCard'

export default function ScriptsWorkspace() {
  const { colors } = useTheme()
  const packages = useScriptsStore((s) => s.packages)
  const isLoading = useScriptsStore((s) => s.isLoading)
  const error = useScriptsStore((s) => s.error)
  const selectedPackageIndex = useScriptsStore((s) => s.selectedPackageIndex)
  const runningScripts = useScriptsStore((s) => s.runningScripts)
  const fetchScripts = useScriptsStore((s) => s.fetchScripts)
  const runScript = useScriptsStore((s) => s.runScript)
  const runCommand = useScriptsStore((s) => s.runCommand)
  const stopScript = useScriptsStore((s) => s.stopScript)
  const dismissScript = useScriptsStore((s) => s.dismissScript)
  const selectPackage = useScriptsStore((s) => s.selectPackage)
  const openPreview = usePreviewStore((s) => s.openPreview)
  const taskLogs = useTaskStore((s) => s.taskLogs)
  const [suggestedOpen, setSuggestedOpen] = useState(false)
  const emptyLines: string[] = []

  function getOutputLines(taskId: string | undefined): string[] {
    if (!taskId) return emptyLines
    return taskLogs.get(taskId) ?? emptyLines
  }

  useEffect(() => {
    void fetchScripts()
  }, [fetchScripts])

  const selectedPkg = packages[selectedPackageIndex] ?? null

  const grouped = useMemo(() => {
    if (!selectedPkg) return new Map()
    return groupByCategory(categorizeScripts(selectedPkg.scripts))
  }, [selectedPkg])

  const suggestedActions = useMemo(() => {
    if (!selectedPkg) return []
    return getSuggestedActions(selectedPkg.packageManager)
  }, [selectedPkg])

  if (isLoading && packages.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading scripts…</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={[styles.errorText, { color: colors.accentRed }]}>{error}</Text>
      </View>
    )
  }

  if (packages.length === 0) {
    return (
      <View style={styles.center}>
        <Terminal color={colors.textTertiary} size={32} strokeWidth={1.5} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No scripts found</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          This project doesn't have a package.json with scripts.
        </Text>
      </View>
    )
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <PackageSelector
        packages={packages}
        selectedIndex={selectedPackageIndex}
        onSelect={selectPackage}
      />

      {selectedPkg && (
        <View style={[styles.pkgHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.pkgName, { color: colors.text }]}>{selectedPkg.name}</Text>
          <Text style={[styles.pkgMeta, { color: colors.textTertiary }]}>
            {selectedPkg.packageManager} · {Object.keys(selectedPkg.scripts).length} scripts
          </Text>
        </View>
      )}

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
                />
              )
            })}
          </View>
        </View>
      ))}

      {selectedPkg && suggestedActions.length > 0 && (
        <View style={[styles.suggestedSection, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setSuggestedOpen((v) => !v)}
            style={styles.suggestedToggle}
          >
            <View style={styles.suggestedToggleLeft}>
              <Wrench color={colors.textTertiary} size={14} strokeWidth={2.25} />
              <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>
                Suggested Actions
              </Text>
            </View>
            {suggestedOpen
              ? <ChevronUp color={colors.textTertiary} size={16} strokeWidth={2} />
              : <ChevronDown color={colors.textTertiary} size={16} strokeWidth={2} />}
          </TouchableOpacity>

          {suggestedOpen && (
            <View style={styles.scriptList}>
              {suggestedActions.map((action) => {
                const key = `${selectedPkg.path}:${action.id}`
                const running = runningScripts.get(key)
                return (
                  <ScriptCard
                    key={action.id}
                    name={action.label}
                    command={action.resolvedCommand}
                    status={running?.status ?? null}
                    detectedPort={running?.detectedPort ?? null}
                    outputLines={getOutputLines(running?.taskId)}
                    onRun={() => runCommand(selectedPkg.path, action.id, action.resolvedCommand)}
                    onStop={() => stopScript(key)}
                    onDismiss={() => dismissScript(key)}
                    onPreview={(port) => openPreview(`http://localhost:${port}`)}
                  />
                )
              })}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: {
    gap: spacing[4],
    paddingBottom: spacing[8],
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    padding: spacing[5],
  },
  loadingText: {
    ...typographyScale.sm,
  },
  errorText: {
    ...typographyScale.sm,
    textAlign: 'center',
  },
  emptyTitle: {
    ...typographyScale.base,
    fontWeight: '700',
  },
  emptySubtitle: {
    ...typographyScale.sm,
    textAlign: 'center',
  },
  pkgHeader: {
    borderBottomWidth: 1,
    paddingBottom: spacing[2],
    gap: 2,
  },
  pkgName: {
    ...typographyScale.lg,
    fontWeight: '700',
  },
  pkgMeta: {
    ...typographyScale.xs,
  },
  section: {
    gap: spacing[2],
  },
  sectionTitle: {
    ...typographyScale.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scriptList: {
    gap: spacing[2],
  },
  suggestedSection: {
    borderTopWidth: 1,
    paddingTop: spacing[3],
    gap: spacing[3],
  },
  suggestedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  suggestedToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
})
