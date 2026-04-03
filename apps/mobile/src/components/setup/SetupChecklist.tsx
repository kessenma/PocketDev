import React, { useEffect, useCallback } from 'react'
import { View, Text, RefreshControl, StyleSheet, Animated, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { spacing, typographyScale, palette } from '@pocketdev/shared/theme'
import { useSetupStore } from '../../stores/setup'
import SetupCheckItem from './SetupCheckItem'
import DatabaseSetup from './DatabaseSetup'
import type { ToolCheck } from '@pocketdev/shared/types'
import { getCodexBlockedReason } from './setup-tool-utils'

interface Props {
  onInstall: (tool: ToolCheck) => void
  onAuthenticate: (tool: ToolCheck) => void
  onGitWizard: (tool: ToolCheck) => void
  onClaudeWizard: (tool: ToolCheck) => void
  onCodexWizard: (tool: ToolCheck) => void
  onBlockedCodexWizard: (tool: ToolCheck) => void
  onPkgWizard: (tool: ToolCheck) => void
  onPythonWizard: (tool: ToolCheck) => void
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void
}

export default function SetupChecklist({
  onInstall,
  onAuthenticate,
  onGitWizard,
  onClaudeWizard,
  onCodexWizard,
  onBlockedCodexWizard,
  onPkgWizard,
  onPythonWizard,
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

  const required = report?.tools.filter((t) => t.required) ?? []
  const optional = report?.tools.filter((t) => !t.required) ?? []
  const dockerTool = report?.tools.find((t) => t.id === 'docker')
  const dockerInstalled = dockerTool?.status === 'installed'
  const codexBlockedReason = getCodexBlockedReason(report)

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
                  {report.ready ? 'Coding tools ready' : 'Tool setup in progress'}
                </Text>
              </View>
            </View>
          )}

          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Core Tools</Text>
          <View style={styles.section}>
            {required.map((tool) => (
              <SetupCheckItem
                key={tool.id}
                tool={tool}
                onInstall={onInstall}
                onAuthenticate={onAuthenticate}
                onGitWizard={onGitWizard}
                onClaudeWizard={onClaudeWizard}
                onCodexWizard={onCodexWizard}
                onBlockedCodexWizard={onBlockedCodexWizard}
                onPkgWizard={onPkgWizard}
                onPythonWizard={onPythonWizard}
                disabledReason={tool.id === 'codex_cli' ? codexBlockedReason : null}
              />
            ))}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Extra Tools</Text>
          <View style={styles.section}>
            {optional.map((tool) => (
              <SetupCheckItem
                key={tool.id}
                tool={tool}
                onInstall={onInstall}
                onAuthenticate={onAuthenticate}
                onGitWizard={onGitWizard}
                onClaudeWizard={onClaudeWizard}
                onCodexWizard={onCodexWizard}
                onBlockedCodexWizard={onBlockedCodexWizard}
                onPkgWizard={onPkgWizard}
                onPythonWizard={onPythonWizard}
                disabledReason={tool.id === 'codex_cli' ? codexBlockedReason : null}
              />
            ))}
          </View>

          <DatabaseSetup
            databases={report?.databases ?? []}
            dockerInstalled={dockerInstalled}
            onRefresh={onRefresh}
          />
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
})
