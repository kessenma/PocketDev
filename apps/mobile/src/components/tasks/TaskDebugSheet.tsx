import React, { useEffect, useRef, useState } from 'react'
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { Bug, CheckCircle2, ChevronLeft, LockKeyhole, ShieldAlert, X } from 'lucide-react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import BauhausButton from '../shared/BauhausButton'
import { typeStyles } from '../../theme/typography'
import { Assets } from '../../../assets'
import type { TaskDebugIssueKind, TaskDebugSelection } from './task-debug-utils'
import type { AgentType } from '@pocketdev/shared/schema'
import type { PrerequisitesReport } from '@pocketdev/shared/types'

type DebugStep = 'issue' | 'cli-select'
type CliKey = 'claude' | 'codex' | 'copilot' | 'opencode'

type PendingPermission = {
  tool_name?: string
  tool_use_id?: string
  description?: string
}

type Props = {
  selection: TaskDebugSelection
  onDismiss: () => void
  onSelect: (selection: TaskDebugSelection) => void
  onContinue: (issue: TaskDebugIssueKind, cli: CliKey) => void
  pendingPermissions?: PendingPermission[]
  taskAgentType?: AgentType
  setupReport?: PrerequisitesReport | null
}

const ISSUE_OPTIONS: Array<{
  key: TaskDebugIssueKind
  title: string
  description: string
  Icon: typeof LockKeyhole
}> = [
  {
    key: 'auth',
    title: 'Auth',
    description: 'Re-authenticate the agent CLI and verify the session without stepping through reinstall.',
    Icon: LockKeyhole,
  },
  {
    key: 'permissions',
    title: 'Permissions',
    description: 'Select which CLI has a pending permission request, then dismiss to answer it in the task stream.',
    Icon: ShieldAlert,
  },
]

const CLI_OPTIONS: Array<{
  key: CliKey
  toolId: string
  label: string
  description: string
}> = [
  {
    key: 'claude',
    toolId: 'claude_cli',
    label: 'Claude',
    description: 'Anthropic Claude — re-run /login to refresh your session.',
  },
  {
    key: 'codex',
    toolId: 'codex_cli',
    label: 'Codex',
    description: 'OpenAI Codex — sign in again via browser or device auth.',
  },
  {
    key: 'copilot',
    toolId: 'copilot_cli',
    label: 'GitHub Copilot',
    description: 'Re-authenticate with gh auth login.',
  },
  {
    key: 'opencode',
    toolId: 'opencode_cli',
    label: 'OpenCode',
    description: 'Re-verify the runtime installation.',
  },
]

function getCliLogo(key: CliKey, isDark: boolean) {
  const map: Record<CliKey, { light: any; dark: any }> = {
    claude: { light: Assets.claudeBlack, dark: Assets.claudeWhite },
    codex: { light: Assets.codexBlack, dark: Assets.codexWhite },
    copilot: { light: Assets.githubCopilotBlack, dark: Assets.githubCopilotWhite },
    opencode: { light: Assets.opencodeBlack, dark: Assets.opencodeWhite },
  }
  return isDark ? map[key]?.dark : map[key]?.light
}

function agentTypeToCliKey(agentType: AgentType | undefined): CliKey | null {
  const map: Partial<Record<AgentType, CliKey>> = {
    claude: 'claude',
    codex: 'codex',
    copilot: 'copilot',
    minimax: 'opencode',
  }
  return agentType ? (map[agentType] ?? null) : null
}

function getDefaultCli(
  taskAgentType: AgentType | undefined,
  setupReport: PrerequisitesReport | null | undefined,
): CliKey | null {
  const installed = CLI_OPTIONS.filter((opt) => {
    const tool = setupReport?.tools.find((t) => t.id === opt.toolId)
    return tool?.status === 'installed'
  })
  const preferredKey = agentTypeToCliKey(taskAgentType)
  if (!installed.length) return preferredKey
  if (preferredKey && installed.some((o) => o.key === preferredKey)) return preferredKey
  return installed[0].key
}

export default function TaskDebugSheet({
  selection,
  onDismiss,
  onSelect,
  onContinue,
  pendingPermissions = [],
  taskAgentType,
  setupReport,
}: Props) {
  const { colors, isDark } = useTheme()
  const sheetRef = useRef<TrueSheet>(null)
  const [step, setStep] = useState<DebugStep>('issue')
  const [cliSelection, setCliSelection] = useState<CliKey | null>(null)

  useEffect(() => {
    sheetRef.current?.present()
  }, [])

  function handleIssueNext() {
    const defaultCli = getDefaultCli(taskAgentType, setupReport)
    setCliSelection(defaultCli)
    setStep('cli-select')
  }

  function handleBack() {
    setStep('issue')
  }

  function handleFinish() {
    if (!selection || !cliSelection) return
    onContinue(selection, cliSelection)
  }

  function isCliInstalled(toolId: string): boolean {
    if (!setupReport) return true
    const tool = setupReport.tools.find((t) => t.id === toolId)
    return !tool || tool.status === 'installed'
  }

  const headerTitle = step === 'issue' ? 'Debug Task' : 'Select CLI'
  const canFinish = step === 'cli-select' && cliSelection != null && selection != null

  return (
    <TrueSheet ref={sheetRef} detents={[0.65, 1]} backgroundColor={colors.background} cornerRadius={24} onDidDismiss={onDismiss}>
      <View style={[styles.sheet, { borderColor: colors.border }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerLeft}>
            {step === 'cli-select' ? (
              <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
                <ChevronLeft color={colors.text} size={20} strokeWidth={2.25} />
              </TouchableOpacity>
            ) : (
              <>
                <Bug color={colors.primary} size={18} strokeWidth={2.25} />
                <Text style={[styles.title, { color: colors.text }]}>{headerTitle}</Text>
              </>
            )}
            {step === 'cli-select' && (
              <Text style={[styles.title, { color: colors.text }]}>{headerTitle}</Text>
            )}
          </View>
          <TouchableOpacity onPress={() => sheetRef.current?.dismiss()} style={styles.closeButton} activeOpacity={0.7}>
            <X color={colors.textTertiary} size={18} strokeWidth={2.25} />
          </TouchableOpacity>
        </View>

        {step === 'issue' ? (
          <>
            <ScrollView contentContainerStyle={styles.body}>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                Pick the issue you want to inspect. PocketDev will preselect the most likely problem when it can infer one from the current task.
              </Text>

              <View style={styles.optionList}>
                {ISSUE_OPTIONS.map(({ key, title, description, Icon }) => {
                  const selected = selection === key
                  return (
                    <TouchableOpacity
                      key={key}
                      activeOpacity={0.7}
                      onPress={() => onSelect(selected ? null : key)}
                      style={[
                        styles.optionCard,
                        {
                          backgroundColor: colors.panelAlt,
                          borderColor: selected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <View style={styles.optionHeader}>
                        <View style={styles.optionTitleWrap}>
                          <Icon color={selected ? colors.primary : colors.textTertiary} size={16} strokeWidth={2.25} />
                          <Text style={[styles.optionTitle, { color: colors.text }]}>{title}</Text>
                        </View>
                        {selected ? (
                          <CheckCircle2 color={colors.primary} size={18} strokeWidth={2.25} />
                        ) : (
                          <View style={[styles.radio, { borderColor: colors.border }]} />
                        )}
                      </View>
                      <Text style={[styles.optionBody, { color: colors.textSecondary }]}>{description}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </ScrollView>

            {selection === 'permissions' && pendingPermissions.length > 0 ? (
              <View style={[styles.permissionsPanel, { borderTopColor: colors.border, backgroundColor: colors.panelAlt }]}>
                <Text style={[styles.permissionsTitle, { color: colors.textSecondary }]}>
                  {pendingPermissions.length} pending approval{pendingPermissions.length > 1 ? 's' : ''}
                </Text>
                {pendingPermissions.map((p, i) => (
                  <View key={p.tool_use_id ?? i} style={[styles.permissionsItem, { borderColor: colors.border }]}>
                    <ShieldAlert color='#f59e0b' size={12} strokeWidth={2.25} style={styles.permissionsIcon} />
                    <Text style={[styles.permissionsItemText, { color: colors.text }]} numberOfLines={1}>
                      {p.tool_name ?? 'Tool'}{p.description ? ` — ${p.description}` : ''}
                    </Text>
                  </View>
                ))}
                <Text style={[styles.permissionsHint, { color: colors.textTertiary }]}>
                  Close this sheet and answer the permission request in the task stream to let the agent continue.
                </Text>
              </View>
            ) : null}

            <View style={[styles.footer, { borderTopColor: colors.border }]}>
              <BauhausButton
                onPress={handleIssueNext}
                disabled={selection == null}
              >
                {selection === 'permissions' ? 'Select CLI' : 'Select CLI'}
              </BauhausButton>
            </View>
          </>
        ) : (
          <>
            <ScrollView contentContainerStyle={styles.body}>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                {selection === 'auth'
                  ? 'Choose which CLI to re-authenticate. The task\'s CLI is preselected.'
                  : 'Choose which CLI has the pending permission request.'}
              </Text>

              <View style={styles.optionList}>
                {CLI_OPTIONS.map(({ key, toolId, label, description }) => {
                  const installed = isCliInstalled(toolId)
                  const selected = cliSelection === key
                  const logo = getCliLogo(key, isDark)
                  return (
                    <TouchableOpacity
                      key={key}
                      activeOpacity={installed ? 0.7 : 1}
                      onPress={() => installed && setCliSelection(selected ? null : key)}
                      style={[
                        styles.optionCard,
                        {
                          backgroundColor: colors.panelAlt,
                          borderColor: selected ? colors.primary : colors.border,
                          opacity: installed ? 1 : 0.4,
                        },
                      ]}
                    >
                      <View style={styles.optionHeader}>
                        <View style={styles.optionTitleWrap}>
                          {logo ? (
                            <Image source={logo} style={styles.cliLogo} resizeMode="contain" />
                          ) : null}
                          <Text style={[styles.optionTitle, { color: colors.text }]}>{label}</Text>
                          {!installed && (
                            <Text style={[styles.notInstalledTag, { color: colors.textTertiary }]}>not installed</Text>
                          )}
                        </View>
                        {selected ? (
                          <CheckCircle2 color={colors.primary} size={18} strokeWidth={2.25} />
                        ) : (
                          <View style={[styles.radio, { borderColor: colors.border }]} />
                        )}
                      </View>
                      <Text style={[styles.optionBody, { color: colors.textSecondary }]}>{description}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: colors.border }]}>
              <BauhausButton
                onPress={handleFinish}
                disabled={!canFinish}
              >
                {selection === 'permissions' ? 'Go to Task Stream' : 'Continue'}
              </BauhausButton>
            </View>
          </>
        )}
      </View>
    </TrueSheet>
  )
}

const styles = StyleSheet.create({
  sheet: {
    minHeight: 360,
    overflow: 'hidden',
  },
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
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing[1],
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
  body: {
    padding: spacing[4],
    gap: spacing[4],
  },
  description: {
    ...typeStyles.bodySmall,
  },
  optionList: {
    gap: spacing[3],
  },
  optionCard: {
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[2],
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flex: 1,
  },
  optionTitle: {
    ...typeStyles.bodyStrong,
  },
  optionBody: {
    ...typeStyles.bodySmall,
  },
  radio: {
    width: 18,
    height: 18,
    borderWidth: 2,
    borderRadius: 9,
  },
  cliLogo: {
    width: 18,
    height: 18,
  },
  notInstalledTag: {
    ...typeStyles.meta,
    marginLeft: spacing[1],
  },
  footer: {
    padding: spacing[4],
    borderTopWidth: 1,
    gap: spacing[2],
  },
  permissionsPanel: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    gap: spacing[2],
  },
  permissionsTitle: {
    ...typeStyles.meta,
    fontWeight: '700',
  },
  permissionsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  permissionsIcon: {
    flexShrink: 0,
  },
  permissionsItemText: {
    ...typeStyles.bodySmall,
    flex: 1,
  },
  permissionsHint: {
    ...typeStyles.bodySmall,
    marginTop: spacing[1],
  },
})
