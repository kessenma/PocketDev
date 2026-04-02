import React, { useEffect, useCallback } from 'react'
import { View, Text, FlatList, RefreshControl, StyleSheet } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { spacing, typographyScale } from '@pocketdev/shared/theme'
import { useSetupStore } from '../../stores/setup'
import SetupCheckItem from './SetupCheckItem'
import DatabaseSetup from './DatabaseSetup'
import type { ToolCheck } from '@pocketdev/shared/types'

interface Props {
  onInstall: (tool: ToolCheck) => void
  onAuthenticate: (tool: ToolCheck) => void
}

export default function SetupChecklist({ onInstall, onAuthenticate }: Props) {
  const { colors } = useTheme()
  const { report, loading, error, fetchPrerequisites } = useSetupStore()

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

  return (
    <FlatList
      data={[]}
      renderItem={() => null}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.text} />
      }
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <>
          {report && (
            <View style={styles.serverInfo}>
              <Text style={[styles.osText, { color: colors.textSecondary }]}>
                {report.os} ({report.arch})
              </Text>
            </View>
          )}

          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Required</Text>
          <View style={styles.section}>
            {required.map((tool) => (
              <SetupCheckItem
                key={tool.id}
                tool={tool}
                onInstall={onInstall}
                onAuthenticate={onAuthenticate}
              />
            ))}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Optional</Text>
          <View style={styles.section}>
            {optional.map((tool) => (
              <SetupCheckItem
                key={tool.id}
                tool={tool}
                onInstall={onInstall}
                onAuthenticate={onAuthenticate}
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
  serverInfo: {
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  osText: {
    ...typographyScale.sm,
  },
  sectionTitle: {
    ...typographyScale.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: spacing[2],
  },
  section: {
    gap: spacing[2],
  },
})
