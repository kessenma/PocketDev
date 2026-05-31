import React, { useEffect, useState } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native'
import ReanimatedLib, { useAnimatedStyle, interpolate } from 'react-native-reanimated'
import { History, SportShoe, Terminal, Wrench } from 'lucide-react-native'
import { spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../../contexts/ThemeContext'
import { useScriptsStore } from '../../../stores/scripts'
import { useProjectsStore } from '../../../stores/projects'
import PackageSelector from '../../scripts/PackageSelector'
import type { CodeScreenTabProps, CodeSubTabOption } from '../navigation/types'
import { typeStyles } from '../../../theme/typography'
import PackageScripts from './views/PackageScripts'
import SuggestedScripts from './views/SuggestedScripts'
import RunningScripts from './views/RunningScripts'
import HistoryScripts from './views/HistoryScripts'
import ShrinkableHeader, { useShrinkableHeader } from '../../ui/ShrinkableHeader'
import TabScrollContainer from '../navigation/TabScrollContainer'

type ScriptsView = 'scripts' | 'suggested' | 'running' | 'history'

const VIEW_OPTIONS: readonly CodeSubTabOption<ScriptsView>[] = [
  { value: 'scripts', label: 'Scripts', icon: Terminal },
  { value: 'suggested', label: 'Suggested', icon: Wrench },
  { value: 'running', label: 'Running', icon: SportShoe },
  { value: 'history', label: 'History', icon: History },
]

export default function ScriptsTab({ onScroll }: CodeScreenTabProps) {
  const { colors } = useTheme()
  const packages = useScriptsStore((s) => s.packages)
  const isLoading = useScriptsStore((s) => s.isLoading)
  const error = useScriptsStore((s) => s.error)
  const selectedPackageIndex = useScriptsStore((s) => s.selectedPackageIndex)
  const fetchScripts = useScriptsStore((s) => s.fetchScripts)
  const selectPackage = useScriptsStore((s) => s.selectPackage)
  const activeProjectId = useProjectsStore((s) => s.activeProjectId)
  const [activeView, setActiveView] = useState<ScriptsView>('scripts')

  useEffect(() => {
    if (activeProjectId) {
      void fetchScripts()
    }
  }, [activeProjectId, fetchScripts])

  const selectedPkg = packages[selectedPackageIndex] ?? null

  const { scrollY, scrollHandler } = useShrinkableHeader(onScroll)

  // Custom collapse animation for the pkg header (different range from standard hero)
  const pkgHeaderStyle = useAnimatedStyle(() => ({
    height: interpolate(scrollY.value, [0, 80], [48, 0], 'clamp'),
    opacity: interpolate(scrollY.value, [0, 60], [1, 0], 'clamp'),
    overflow: 'hidden',
  }))

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
      <TabScrollContainer
        contentContainerStyle={styles.scroll}
        minPaddingBottom={spacing[8]}
        onScroll={scrollHandler}
      >
        {activeView === 'scripts' && <PackageScripts />}
        {activeView === 'suggested' && <SuggestedScripts />}
        {activeView === 'running' && <RunningScripts />}
        {activeView === 'history' && <HistoryScripts />}
      </TabScrollContainer>
    )
  })()

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ShrinkableHeader
        scrollY={scrollY}
        hero={
          selectedPkg ? (
            <ReanimatedLib.View style={[styles.pkgHeader, { borderBottomColor: colors.border }, pkgHeaderStyle]}>
              <Text style={[styles.pkgName, { color: colors.text }]}>{selectedPkg.name}</Text>
              <Text style={[styles.pkgMeta, { color: colors.textTertiary }]}>
                {selectedPkg.packageManager} · {Object.keys(selectedPkg.scripts).length} scripts
              </Text>
            </ReanimatedLib.View>
          ) : null
        }
        tabs={{
          value: activeView,
          options: VIEW_OPTIONS,
          onChange: setActiveView,
          labelMode: 'active-only',
          variant: 'segmented',
        }}
      >
        {packages.length > 0 ? (
          <PackageSelector
            packages={packages}
            selectedIndex={selectedPackageIndex}
            onSelect={selectPackage}
          />
        ) : null}
      </ShrinkableHeader>

      <View style={styles.content}>{sectionBody}</View>
    </KeyboardAvoidingView>
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
})
