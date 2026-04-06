import React, { useEffect, useMemo } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Terminal } from 'lucide-react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { useScriptsStore } from '../../stores/scripts'
import { usePreviewStore } from '../../stores/preview'
import { categorizeScripts, groupByCategory, CATEGORY_LABELS } from './model'
import type { ScriptCategory } from './model'
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
  const stopScript = useScriptsStore((s) => s.stopScript)
  const selectPackage = useScriptsStore((s) => s.selectPackage)
  const openPreview = usePreviewStore((s) => s.openPreview)

  useEffect(() => {
    void fetchScripts()
  }, [fetchScripts])

  const selectedPkg = packages[selectedPackageIndex] ?? null

  const grouped = useMemo(() => {
    if (!selectedPkg) return new Map()
    return groupByCategory(categorizeScripts(selectedPkg.scripts))
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
            {scripts.map((script) => {
              const key = `${selectedPkg!.path}:${script.name}`
              const running = runningScripts.get(key)
              return (
                <ScriptCard
                  key={script.name}
                  name={script.name}
                  command={script.command}
                  isRunning={!!running}
                  detectedPort={running?.detectedPort ?? null}
                  onRun={() => runScript(selectedPkg!.path, script.name)}
                  onStop={() => stopScript(key)}
                  onPreview={(port) => openPreview(`http://localhost:${port}`)}
                />
              )
            })}
          </View>
        </View>
      ))}
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
})
