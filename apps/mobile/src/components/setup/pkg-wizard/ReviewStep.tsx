import React from 'react'
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius } from '@pocketdev/shared/theme'
import { typeStyles } from '../../../theme/typography'
import { Assets } from '../../../../assets'
import { Check, X, Info } from 'lucide-react-native'
import type { PkgInstallTool, PkgManagerStatus } from '@pocketdev/shared/types'
import { buildInstallPlan, buildSelectedInstallPlan } from './model'

type WizardAction =
  | { type: 'TOGGLE_TOOL'; tool: PkgInstallTool }
  | { type: 'STEP_COMPLETE'; step: 'review' }

interface Props {
  pkgStatus: PkgManagerStatus
  selectedTools: PkgInstallTool[]
  dispatch: (action: WizardAction) => void
}
export { buildInstallPlan }

export default function ReviewStep({ pkgStatus, selectedTools, dispatch }: Props) {
  const { colors, isDark } = useTheme()
  const tools = buildInstallPlan(pkgStatus).map((tool) => ({
    ...tool,
    version:
      tool.id === 'npm' ? pkgStatus.npm.version
        : tool.id === 'pnpm' ? pkgStatus.pnpm.version
          : pkgStatus.bun.version,
    logo:
      tool.id === 'npm' ? (isDark ? Assets.npmWhite : Assets.npmBlack)
        : tool.id === 'pnpm' ? (isDark ? Assets.pnpmWhite : Assets.pnpmBlack)
          : (isDark ? Assets.bunWhite : Assets.bunBlack),
  }))
  const selectedPlan = buildSelectedInstallPlan(pkgStatus, selectedTools)

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>Installation Plan</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {selectedPlan.length > 0
            ? `${selectedPlan.length} tool${selectedPlan.length > 1 ? 's' : ''} selected to enable or refresh.`
            : 'All package tools are available. Select any tool below if you want to refresh it.'}
        </Text>

        {/* Tool status list */}
        <View style={styles.toolList}>
          {tools.map((tool) => {
            const isSelected = selectedTools.includes(tool.id)
            return (
              <View key={tool.id} style={[styles.toolCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.toolHeader}>
                  <Image source={tool.logo} style={styles.toolLogo} resizeMode="contain" />
                  <View style={styles.toolInfo}>
                    <Text style={[styles.toolName, { color: colors.text }]}>{tool.name}</Text>
                    {tool.installed ? (
                      <Text style={[styles.toolVersion, { color: '#22c55e' }]}>
                        v{tool.version ?? 'installed'}
                      </Text>
                    ) : (
                      <Text style={[styles.toolVersion, { color: colors.error }]}>Not installed</Text>
                    )}
                  </View>
                  {tool.installed ? (
                    <Check color="#22c55e" size={18} strokeWidth={2.5} />
                  ) : (
                    <X color={colors.error} size={18} strokeWidth={2.5} />
                  )}
                </View>

                <View style={styles.commandSection}>
                  <View style={[styles.commandBlock, { backgroundColor: colors.background }]}>
                    <Text style={[styles.commandText, { color: colors.text }]}>
                      {tool.installed
                        ? isSelected ? `PocketDev will reinstall ${tool.name}.` : `${tool.name} is already installed.`
                        : `PocketDev will enable ${tool.name} for this workspace.`}
                    </Text>
                  </View>
                  <Text style={[styles.commandDesc, { color: colors.textTertiary }]}>
                    {tool.description}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.selectionButton,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.background,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => dispatch({ type: 'TOGGLE_TOOL', tool: tool.id })}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.selectionButtonText,
                    { color: isSelected ? colors.primaryText : colors.text },
                  ]}>
                    {tool.installed
                      ? isSelected ? 'Reinstall selected' : 'Reinstall'
                      : isSelected ? 'Will install' : 'Skip install'}
                  </Text>
                </TouchableOpacity>
              </View>
            )
          })}
        </View>

        {selectedPlan.length > 0 && (
          <View style={[styles.infoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Info color={colors.textTertiary} size={16} strokeWidth={2} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Missing tools are preselected. Installed tools stay untouched unless you explicitly choose reinstall.
            </Text>
          </View>
        )}

        {selectedPlan.length === 0 && (
          <View style={[styles.infoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Info color={colors.textTertiary} size={16} strokeWidth={2} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              No actions selected. Continue to keep your current package setup as-is.
            </Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.installButton, { backgroundColor: colors.primary }]}
        onPress={() => dispatch({ type: 'STEP_COMPLETE', step: 'review' })}
        activeOpacity={0.7}
      >
        <Text style={[styles.installButtonText, { color: colors.primaryText }]}>
          {selectedPlan.length > 0
            ? `${selectedPlan.length === 1 ? 'Run 1 action' : `Run ${selectedPlan.length} actions`}`
            : 'Done'}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing[3],
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing[3],
    paddingBottom: spacing[4],
  },
  title: {
    ...typeStyles.screenTitle,
  },
  subtitle: {
    ...typeStyles.bodySmall,
  },
  toolList: {
    gap: spacing[2],
    marginTop: spacing[1],
  },
  toolCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[3],
  },
  toolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  toolLogo: {
    width: 28,
    height: 28,
  },
  toolInfo: {
    flex: 1,
    gap: 1,
  },
  toolName: {
    ...typeStyles.button,
  },
  toolVersion: {
    ...typeStyles.mono,
  },
  commandSection: {
    gap: spacing[2],
  },
  commandBlock: {
    borderRadius: borderRadius.md,
    padding: spacing[3],
  },
  commandText: {
    ...typeStyles.mono,
  },
  commandDesc: {
    ...typeStyles.meta,
    paddingLeft: spacing[1],
  },
  selectionButton: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
  },
  selectionButtonText: {
    ...typeStyles.button,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[3],
    borderWidth: 1,
    borderRadius: borderRadius.lg,
  },
  infoText: {
    ...typeStyles.meta,
    flex: 1,
  },
  installButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
  },
  installButtonText: {
    ...typeStyles.button,
  },
})
