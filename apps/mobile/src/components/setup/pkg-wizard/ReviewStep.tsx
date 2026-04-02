import React from 'react'
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { Assets } from '../../../../assets'
import { Check, X, Info } from 'lucide-react-native'
import type { PkgManagerStatus } from '@pocketdev/shared/types'

export interface InstallPlanItem {
  id: string
  name: string
  commands: string[]
  description: string
}

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'review' }

interface Props {
  pkgStatus: PkgManagerStatus
  dispatch: (action: WizardAction) => void
}

function buildInstallPlan(status: PkgManagerStatus): InstallPlanItem[] {
  const plan: InstallPlanItem[] = []

  if (!status.nvm.installed) {
    plan.push({
      id: 'nvm',
      name: 'nvm',
      commands: ['curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash'],
      description: 'Installs Node Version Manager to ~/.nvm',
    })
  }

  if (!status.npm.installed) {
    plan.push({
      id: 'npm',
      name: 'Node.js + npm',
      commands: ['nvm install --lts'],
      description: 'Installs the latest LTS version of Node.js (includes npm)',
    })
  }

  if (!status.pnpm.installed) {
    plan.push({
      id: 'pnpm',
      name: 'pnpm',
      commands: ['curl -fsSL https://get.pnpm.io/install.sh | sh -'],
      description: 'Installs pnpm to ~/.local/share/pnpm',
    })
  }

  return plan
}

export { buildInstallPlan }

export default function ReviewStep({ pkgStatus, dispatch }: Props) {
  const { colors, isDark } = useTheme()
  const installPlan = buildInstallPlan(pkgStatus)

  const tools = [
    { id: 'nvm', name: 'nvm', installed: pkgStatus.nvm.installed, version: pkgStatus.nvm.version, logo: isDark ? Assets.nvmWhite : Assets.nvmBlack },
    { id: 'npm', name: 'Node.js + npm', installed: pkgStatus.npm.installed, version: pkgStatus.npm.version, logo: isDark ? Assets.npmWhite : Assets.npmBlack },
    { id: 'pnpm', name: 'pnpm', installed: pkgStatus.pnpm.installed, version: pkgStatus.pnpm.version, logo: isDark ? Assets.pnpmWhite : Assets.pnpmBlack },
    { id: 'bun', name: 'Bun', installed: pkgStatus.bun.installed, version: pkgStatus.bun.version, logo: isDark ? Assets.bunWhite : Assets.bunBlack },
  ]

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>Installation Plan</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {installPlan.length > 0
            ? `${installPlan.length} tool${installPlan.length > 1 ? 's' : ''} will be installed on your server.`
            : 'All package managers are installed.'}
        </Text>

        {/* Tool status list */}
        <View style={styles.toolList}>
          {tools.map((tool) => {
            const planItem = installPlan.find((p) => p.id === tool.id)
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

                {/* Command preview for missing tools */}
                {planItem && (
                  <View style={styles.commandSection}>
                    {planItem.commands.map((cmd, i) => (
                      <View key={i} style={[styles.commandBlock, { backgroundColor: colors.background }]}>
                        <Text style={[styles.commandText, { color: colors.text }]} selectable>
                          $ {cmd}
                        </Text>
                      </View>
                    ))}
                    <Text style={[styles.commandDesc, { color: colors.textTertiary }]}>
                      {planItem.description}
                    </Text>
                  </View>
                )}
              </View>
            )
          })}
        </View>

        {/* Info note */}
        {installPlan.length > 0 && (
          <View style={[styles.infoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Info color={colors.textTertiary} size={16} strokeWidth={2} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              All tools install to your home directory — no sudo required.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Install button */}
      {installPlan.length > 0 && (
        <TouchableOpacity
          style={[styles.installButton, { backgroundColor: colors.primary }]}
          onPress={() => dispatch({ type: 'STEP_COMPLETE', step: 'review' })}
          activeOpacity={0.7}
        >
          <Text style={[styles.installButtonText, { color: colors.primaryText }]}>
            Install {installPlan.length} tool{installPlan.length > 1 ? 's' : ''}
          </Text>
        </TouchableOpacity>
      )}
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
    ...typographyScale.xl,
    fontWeight: '700',
  },
  subtitle: {
    ...typographyScale.sm,
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
    ...typographyScale.base,
    fontWeight: '600',
  },
  toolVersion: {
    ...typographyScale.xs,
    fontFamily: 'monospace',
  },
  commandSection: {
    gap: spacing[2],
  },
  commandBlock: {
    borderRadius: borderRadius.md,
    padding: spacing[3],
  },
  commandText: {
    ...typographyScale.xs,
    fontFamily: 'monospace',
  },
  commandDesc: {
    ...typographyScale.xs,
    paddingLeft: spacing[1],
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
    ...typographyScale.xs,
    flex: 1,
  },
  installButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
  },
  installButtonText: {
    ...typographyScale.base,
    fontWeight: '600',
  },
})
