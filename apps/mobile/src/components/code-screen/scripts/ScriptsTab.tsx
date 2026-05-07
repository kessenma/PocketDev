import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { History, SportShoe, Terminal, Wrench } from 'lucide-react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../../contexts/ThemeContext'
import { usePreviewStore } from '../../../stores/preview'
import { useScriptsStore } from '../../../stores/scripts'
import { useTaskStore } from '../../../stores/tasks'
import PackageSelector from '../../scripts/PackageSelector'
import ScriptCard from '../../scripts/ScriptCard'
import { CATEGORY_LABELS, categorizeScripts, getGroupedSuggestedActions, getSuggestedActions, groupByCategory } from '../../scripts/model'
import type { CategorizedScript, MonorepoContext, ScriptCategory } from '../../scripts/model'
import SuggestedGroupAccordion from '../../scripts/SuggestedGroupAccordion'
import CodeScreenHeader from '../navigation/CodeScreenHeader'
import CodeSubTabNavigator from '../navigation/CodeSubTabNavigator'
import type { CodeScreenTabProps, CodeSubTabOption } from '../navigation/types'
import { typeStyles } from '../../../theme/typography'
import ScriptHistorySheet from './ScriptHistorySheet'

type ScriptsView = 'scripts' | 'suggested' | 'running'

const VIEW_OPTIONS: readonly CodeSubTabOption<ScriptsView>[] = [
  { value: 'scripts', label: 'Scripts', icon: Terminal },
  { value: 'suggested', label: 'Suggested', icon: Wrench },
  { value: 'running', label: 'Running', icon: SportShoe },
]

export default function ScriptsTab({ onScroll }: CodeScreenTabProps) {
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
  const sendInput = useTaskStore((s) => s.sendInput)
  const [activeView, setActiveView] = useState<ScriptsView>('scripts')
  const [historyVisible, setHistoryVisible] = useState(false)
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

  const isMonorepo = packages.length > 1
  const isMonorepoRoot = isMonorepo && (selectedPkg?.path === '.')

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

  const runningEntries = useMemo(
    () => Array.from(runningScripts.entries()),
    [runningScripts],
  )

  const scrollY = useRef(new Animated.Value(0)).current

  const pkgHeaderHeight = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [48, 0],
    extrapolate: 'clamp',
  })

  const pkgHeaderOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  const controlCompact = scrollY.interpolate({
    inputRange: [60, 120],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })

  const headerPadV = scrollY.interpolate({
    inputRange: [60, 120],
    outputRange: [spacing[3], spacing[1]],
    extrapolate: 'clamp',
  })

  const headerGap = scrollY.interpolate({
    inputRange: [60, 120],
    outputRange: [spacing[2], 0],
    extrapolate: 'clamp',
  })

  const sectionBody = (() => {
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
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false, listener: onScroll as any },
        )}
        scrollEventThrottle={16}
      >
        {activeView === 'scripts' ? (
          Array.from(grouped.entries()).map(([category, scripts]) => (
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
          ))
        ) : null}

        {activeView === 'suggested' ? (
          isMonorepoRoot ? (
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
          ) : suggestedActions.length > 0 ? (
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
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No suggested actions</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                This package manager does not have any quick actions configured yet.
              </Text>
            </View>
          )
        ) : null}

        {activeView === 'running' ? (
          runningEntries.length > 0 ? (
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
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No running scripts</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Start a script from the Scripts or Suggested tabs to see its live output here.
              </Text>
            </View>
          )
        ) : null}
      </ScrollView>
    )
  })()

  return (
    <View style={styles.container}>
      <CodeScreenHeader style={{ paddingTop: headerPadV, paddingBottom: headerPadV, gap: headerGap }}>
        {packages.length > 0 ? (
          <PackageSelector
            packages={packages}
            selectedIndex={selectedPackageIndex}
            onSelect={selectPackage}
          />
        ) : null}

        {selectedPkg ? (
          <Animated.View style={[styles.pkgHeader, { borderBottomColor: colors.border, height: pkgHeaderHeight, opacity: pkgHeaderOpacity, overflow: 'hidden' }]}>
            <Text style={[styles.pkgName, { color: colors.text }]}>{selectedPkg.name}</Text>
            <Text style={[styles.pkgMeta, { color: colors.textTertiary }]}>
              {selectedPkg.packageManager} · {Object.keys(selectedPkg.scripts).length} scripts
            </Text>
          </Animated.View>
        ) : null}

        <View style={styles.subNavRow}>
          <CodeSubTabNavigator value={activeView} options={VIEW_OPTIONS} onChange={setActiveView} compact={controlCompact} />
          <TouchableOpacity onPress={() => setHistoryVisible(true)} style={styles.historyButton} activeOpacity={0.7}>
            <History color={colors.textSecondary} size={20} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </CodeScreenHeader>

      <View style={styles.content}>{sectionBody}</View>

      {historyVisible && <ScriptHistorySheet onDismiss={() => setHistoryVisible(false)} />}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing[3],
  },
  content: {
    flex: 1,
  },
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
    ...typeStyles.bodySmall,
  },
  errorText: {
    ...typeStyles.bodySmall,
    textAlign: 'center',
  },
  emptyTitle: {
    ...typeStyles.bodyBold,
  },
  emptySubtitle: {
    ...typeStyles.bodySmall,
    textAlign: 'center',
  },
  emptyCard: {
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    gap: spacing[2],
  },
  pkgHeader: {
    borderBottomWidth: 1,
    paddingBottom: spacing[2],
    gap: 2,
  },
  pkgName: {
    ...typeStyles.heading,
  },
  pkgMeta: {
    ...typeStyles.meta,
  },
  section: {
    gap: spacing[2],
  },
  sectionTitle: {
    ...typeStyles.sectionTitle,
  },
  scriptList: {
    gap: spacing[2],
  },
  subNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  historyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
