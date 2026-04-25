import React, { useEffect, useCallback } from 'react'
import { View, Text, RefreshControl, StyleSheet, Animated, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { spacing, palette } from '@pocketdev/shared/theme'
import { typeStyles } from '../../theme/typography'
import { useSetupStore } from '../../stores/setup'
import { useToast } from '../../hooks/useToast'
import SetupCheckItem from './SetupCheckItem'
import DatabaseSetup from './DatabaseSetup'
import OnDeviceModelSetup from './OnDeviceModelSetup'
import type { ToolCheck } from '@pocketdev/shared/types'
import {
  getAiAssistantTools,
  getCodexBlockedReason,
  getCopilotBlockedReason,
  getMinimaxBlockedReason,
  getLanguageTools,
  getOpenCodeTool,
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
  onMinimaxWizard: (tool: ToolCheck) => void
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
  onMinimaxWizard,
  onScroll,
}: Props) {
  const { colors } = useTheme()
  const { toast } = useToast()
  const {
    report,
    loading,
    error,
    hydrated,
    revalidating,
    reportSource,
    pendingToolIds,
    fetchPrerequisites,
  } = useSetupStore()
  const bauhaus = palette.bauhaus

  useEffect(() => {
    fetchPrerequisites()
  }, [fetchPrerequisites])

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

  const showCachedLoadingState = !!report && revalidating && reportSource === 'cache'
  const showSkeletonState = !report && (loading || revalidating || !hydrated)

  const required = getRequiredSetupTools(report)
  const opencodeTool = getOpenCodeTool(report)
  const aiAssistants = getAiAssistantTools(report)
  const languages = getLanguageTools(report)
  const supportingTools = getSupportingTools(report)
  const dockerTool = report?.tools.find((t) => t.id === 'docker')
  const dockerInstalled = dockerTool?.status === 'installed'
  const codexBlockedReason = getCodexBlockedReason(report)
  const copilotBlockedReason = getCopilotBlockedReason(report)
  const minimaxBlockedReason = getMinimaxBlockedReason(report)
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
        onMinimaxWizard={onMinimaxWizard}
        disabledReason={
          tool.id === 'codex_cli'
            ? codexBlockedReason
            : tool.id === 'copilot_cli'
              ? copilotBlockedReason
              : tool.id === 'minimax_provider'
                ? minimaxBlockedReason
                : null
        }
        disabled={showCachedLoadingState}
        showLoadingState={showCachedLoadingState || pendingToolIds.includes(tool.id)}
        onDisabledPress={() => {
          toast({
            title: 'Checking workspace status',
            description: 'Setup actions are locked until the server confirms the current tool status.',
            variant: 'info',
          })
        }}
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
                  {showCachedLoadingState
                    ? 'Checking saved setup…'
                    : revalidating
                      ? 'Refreshing workspace status'
                      : setupStatus.ready
                        ? 'Coding tools ready'
                        : 'Tool setup in progress'}
                </Text>
                {showCachedLoadingState && (
                  <Text style={[styles.serverInfoMeta, { color: 'rgba(255,255,255,0.7)' }]}>
                    Showing the last known device state until the server confirms it.
                  </Text>
                )}
              </View>
            </View>
          )}

          {error && report && (
            <View style={[styles.banner, { backgroundColor: colors.errorBackground, borderColor: colors.error }]}>
              <Text style={[styles.bannerTitle, { color: colors.error }]}>Server check failed</Text>
              <Text style={[styles.bannerBody, { color: colors.textSecondary }]}>
                Showing the last known setup state. Pull to refresh when the workspace is reachable again.
              </Text>
            </View>
          )}

          {showSkeletonState ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Required Setup</Text>
              <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
                Checking your workspace before showing setup actions.
              </Text>
              <View style={styles.section}>
                {Array.from({ length: 2 }).map((_, index) => (
                  <View
                    key={`required-skeleton-${index}`}
                    style={[styles.skeletonCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <View style={[styles.skeletonAccent, { backgroundColor: colors.border }]} />
                    <View style={styles.skeletonHeader}>
                      <View style={[styles.skeletonAvatar, { backgroundColor: colors.border }]} />
                      <View style={styles.skeletonTextColumn}>
                        <View style={[styles.skeletonLinePrimary, { backgroundColor: colors.border }]} />
                        <View style={[styles.skeletonLineSecondary, { backgroundColor: colors.border }]} />
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>AI Assistant</Text>
              <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
                Restoring the last known tool state while the server responds.
              </Text>
              <View style={styles.section}>
                {Array.from({ length: 2 }).map((_, index) => (
                  <View
                    key={`ai-skeleton-${index}`}
                    style={[styles.skeletonCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <View style={[styles.skeletonAccent, { backgroundColor: colors.border }]} />
                    <View style={styles.skeletonHeader}>
                      <View style={[styles.skeletonAvatar, { backgroundColor: colors.border }]} />
                      <View style={styles.skeletonTextColumn}>
                        <View style={[styles.skeletonLinePrimary, { backgroundColor: colors.border }]} />
                        <View style={[styles.skeletonLineSecondary, { backgroundColor: colors.border }]} />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Required Setup</Text>
              <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
                Complete Git and package managers.
              </Text>
              <View style={[styles.section, showCachedLoadingState && styles.sectionMuted]}>
                {renderTools(required)}
              </View>

              {opencodeTool ? (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>AI Runtime</Text>
                  <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
                    opencode is required for Codex (OpenAI) and GitHub Copilot.
                  </Text>
                  <View style={[styles.section, showCachedLoadingState && styles.sectionMuted]}>
                    <SetupCheckItem
                      tool={opencodeTool}
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
                      onMinimaxWizard={onMinimaxWizard}
                      disabledReason={null}
                      disabled={showCachedLoadingState}
                      showLoadingState={showCachedLoadingState}
                      onDisabledPress={() => {
                        toast({
                          title: 'Checking workspace status',
                          description: 'Setup actions are locked until the server confirms the current tool status.',
                          variant: 'info',
                        })
                      }}
                    />
                  </View>
                </>
              ) : null}

              <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>AI Assistant</Text>
              <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
                Choose at least one: Claude, Codex (OpenAI), or GitHub Copilot.
              </Text>
              <View style={[styles.section, showCachedLoadingState && styles.sectionMuted]}>
                {renderTools(aiAssistants)}
              </View>

              <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Language</Text>
              <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
                Set up Python, Rust, Go, and TypeScript for workspace language support.
              </Text>
              <View style={[styles.section, showCachedLoadingState && styles.sectionMuted]}>
                {renderTools(languages)}
              </View>

              {supportingTools.length ? (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Supporting Tools</Text>
                  <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
                    Additional utilities PocketDev can use during setup and workspace tasks.
                  </Text>
                  <View style={[styles.section, showCachedLoadingState && styles.sectionMuted]}>
                    {renderTools(supportingTools)}
                  </View>
                </>
              ) : null}

              <DatabaseSetup
                databases={report?.databases ?? []}
                dockerInstalled={dockerInstalled}
                onRefresh={onRefresh}
              />
            </>
          )}

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
    ...typeStyles.bodySmall,
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
    ...typeStyles.sectionTitle,
    marginBottom: 4,
  },
  serverInfoValue: {
    ...typeStyles.bodyBold,
  },
  serverInfoMeta: {
    ...typeStyles.meta,
    marginTop: spacing[1],
  },
  banner: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    gap: spacing[1],
    marginBottom: spacing[2],
  },
  bannerTitle: {
    ...typeStyles.bodySmall,
    fontWeight: '700',
  },
  bannerBody: {
    ...typeStyles.meta,
  },
  sectionTitle: {
    ...typeStyles.sectionTitle,
    marginTop: spacing[2],
  },
  section: {
    gap: spacing[2],
  },
  sectionMuted: {
    opacity: 0.9,
  },
  sectionHint: {
    ...typeStyles.bodySmall,
    marginTop: -spacing[1],
    marginBottom: spacing[1],
  },
  skeletonCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: spacing[4],
    overflow: 'hidden',
  },
  skeletonAccent: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 76,
    height: 76,
    borderBottomLeftRadius: 28,
    opacity: 0.55,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  skeletonAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    opacity: 0.7,
  },
  skeletonTextColumn: {
    flex: 1,
    gap: spacing[2],
  },
  skeletonLinePrimary: {
    width: '42%',
    height: 14,
    borderRadius: 999,
    opacity: 0.8,
  },
  skeletonLineSecondary: {
    width: '68%',
    height: 10,
    borderRadius: 999,
    opacity: 0.45,
  },
})
