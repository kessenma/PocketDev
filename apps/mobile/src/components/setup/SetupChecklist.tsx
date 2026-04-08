import React, { useEffect, useCallback } from 'react'
import { View, Text, RefreshControl, StyleSheet, Animated, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { spacing, typographyScale, palette } from '@pocketdev/shared/theme'
import { useSetupStore } from '../../stores/setup'
import SetupCheckItem from './SetupCheckItem'
import DatabaseSetup from './DatabaseSetup'
import OnDeviceModelSetup from './OnDeviceModelSetup'
import type { ToolCheck } from '@pocketdev/shared/types'
import {
  getAiAssistantTools,
  getCodexBlockedReason,
  getCopilotBlockedReason,
  getLanguageTools,
  getRequiredSetupTools,
  getServerSetupStatus,
  getSupportingTools,
} from './setup-tool-utils'

interface Props {
  onInstall: (tool: ToolCheck) => void
  onAuthenticate: (tool: ToolCheck) => void
  onGitWizard: (tool: ToolCheck) => void
  onClaudeWizard: (tool: ToolCheck) => void
  onCodexWizard: (tool: ToolCheck) => void
  onBlockedCodexWizard: (tool: ToolCheck) => void
  onCopilotWizard: (tool: ToolCheck) => void
  onBlockedCopilotWizard: (tool: ToolCheck) => void
  onOpenCodeWizard: (tool: ToolCheck) => void
  onPkgWizard: (tool: ToolCheck) => void
  onPythonWizard: (tool: ToolCheck) => void
  onRustWizard: (tool: ToolCheck) => void
  onGoWizard: (tool: ToolCheck) => void
  onTypeScriptWizard: (tool: ToolCheck) => void
  onDockerWizard: (tool: ToolCheck) => void
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void
}

export default function SetupChecklist({
  onInstall,
  onAuthenticate,
  onGitWizard,
  onClaudeWizard,
  onCodexWizard,
  onBlockedCodexWizard,
  onCopilotWizard,
  onBlockedCopilotWizard,
  onOpenCodeWizard,
  onPkgWizard,
  onPythonWizard,
  onRustWizard,
  onGoWizard,
  onTypeScriptWizard,
  onDockerWizard,
  onScroll,
}: Props) {
  const { colors } = useTheme()
  const { report, loading, error, fetchPrerequisites } = useSetupStore()
  const bauhaus = palette.bauhaus

  useEffect(() => {
    fetchPrerequisites()
  }, [])

  const onRefresh = useCallback(() => {
    fetchPrerequisites()
  }, [fetchPrerequisites])

  if (error && !report) {
    return (
      <View style={styles.center}>
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      </View>
    )
  }

  const required = getRequiredSetupTools(report)
  const aiAssistants = getAiAssistantTools(report)
  const languages = getLanguageTools(report)
  const supportingTools = getSupportingTools(report)
  const dockerTool = report?.tools.find((t) => t.id === 'docker')
  const dockerInstalled = dockerTool?.status === 'installed'
  const codexBlockedReason = getCodexBlockedReason(report)
  const copilotBlockedReason = getCopilotBlockedReason(report)
  const setupStatus = getServerSetupStatus(report)

  function renderTools(tools: ToolCheck[]) {
    return tools.map((tool) => (
      <SetupCheckItem
        key={`${tool.id}-${tool.name}`}
        tool={tool}
        onInstall={onInstall}
        onAuthenticate={onAuthenticate}
        onGitWizard={onGitWizard}
        onClaudeWizard={onClaudeWizard}
        onCodexWizard={onCodexWizard}
        onBlockedCodexWizard={onBlockedCodexWizard}
        onCopilotWizard={onCopilotWizard}
        onBlockedCopilotWizard={onBlockedCopilotWizard}
        onOpenCodeWizard={onOpenCodeWizard}
        onPkgWizard={onPkgWizard}
        onPythonWizard={onPythonWizard}
        onRustWizard={onRustWizard}
        onGoWizard={onGoWizard}
        onTypeScriptWizard={onTypeScriptWizard}
        onDockerWizard={onDockerWizard}
        disabledReason={
          tool.id === 'codex_cli'
            ? codexBlockedReason
            : tool.id === 'copilot_cli'
              ? copilotBlockedReason
              : null
        }
      />
    ))
  }

  return (
    <Animated.FlatList
      data={[]}
      renderItem={() => null}
      onScroll={onScroll}
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.text} />
      }
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <>
          {report && (
            <View style={styles.serverInfoRow}>
              <View style={[styles.serverInfoCard, { backgroundColor: bauhaus.black }]}>
              <Text style={[styles.serverInfoLabel, { color: 'rgba(255,255,255,0.55)' }]}>Workspace</Text>
              <Text style={[styles.serverInfoValue, { color: '#ffffff' }]}>
                  {setupStatus.ready ? 'Coding tools ready' : 'Tool setup in progress'}
                </Text>
              </View>
            </View>
          )}

          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Required Setup</Text>
          <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
            Complete Git and package managers.
          </Text>
          <View style={styles.section}>
            {renderTools(required)}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>AI Assistant</Text>
          <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
            Choose at least one: Claude, Codex, GitHub Copilot, or OpenCode.
          </Text>
          <View style={styles.section}>
            {renderTools(aiAssistants)}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Language</Text>
          <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
            Set up Python, Rust, Go, and TypeScript for workspace language support.
          </Text>
          <View style={styles.section}>
            {renderTools(languages)}
          </View>

          {supportingTools.length ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Supporting Tools</Text>
              <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
                Additional utilities PocketDev can use during setup and workspace tasks.
              </Text>
              <View style={styles.section}>
                {renderTools(supportingTools)}
              </View>
            </>
          ) : null}

          <DatabaseSetup
            databases={report?.databases ?? []}
            dockerInstalled={dockerInstalled}
            onRefresh={onRefresh}
          />

          <OnDeviceModelSetup />
        </>
      }
    />
  )
}

const styles = StyleSheet.create({
  list: {
    padding: spacing[4],
    gap: spacing[3],
    paddingBottom: spacing[8],
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  error: {
    ...typographyScale.sm,
    textAlign: 'center',
  },
  serverInfoRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[2],
  },
  serverInfoCard: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  serverInfoLabel: {
    ...typographyScale.xs,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  serverInfoValue: {
    ...typographyScale.base,
    fontWeight: '700',
  },
  sectionTitle: {
    ...typographyScale.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: spacing[2],
  },
  section: {
    gap: spacing[2],
  },
  sectionHint: {
    ...typographyScale.sm,
    marginTop: -spacing[1],
    marginBottom: spacing[1],
  },
})
