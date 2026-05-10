import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { KeyRound, Plus } from 'lucide-react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import type { EnvVar } from '@pocketdev/shared/types'
import { useTheme } from '../../../../contexts/ThemeContext'
import { useEnvStore } from '../../../../stores/env'
import { useProjectsStore } from '../../../../stores/projects'
import EnvVarRow from './EnvVarRow'
import EnvVarEditSheet from './EnvVarEditSheet'
import type { CodeScreenTabProps } from '../../navigation/types'
import { typeStyles } from '../../../../theme/typography'

export default function EnvVarsTab({ onScroll }: CodeScreenTabProps) {
  const { colors } = useTheme()
  const projects = useProjectsStore((s) => s.projects)
  const activeProject = projects.find((p) => p.isActive) ?? null
  const projectPath = activeProject?.localPath ?? null

  const envVars = useEnvStore((s) => s.envVars)
  const isLoading = useEnvStore((s) => s.isLoading)
  const error = useEnvStore((s) => s.error)
  const fetchEnvVars = useEnvStore((s) => s.fetch)
  const removeEnvVar = useEnvStore((s) => s.remove)

  const [editTarget, setEditTarget] = useState<EnvVar | null>(null)
  const [showEdit, setShowEdit] = useState(false)

  useEffect(() => {
    if (projectPath) {
      void fetchEnvVars(projectPath)
    }
  }, [projectPath, fetchEnvVars])

  const handleEdit = useCallback((item: EnvVar) => {
    setEditTarget(item)
    setShowEdit(true)
  }, [])

  const handleAdd = useCallback(() => {
    setEditTarget(null)
    setShowEdit(true)
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    await removeEnvVar(id)
  }, [removeEnvVar])

  if (!projectPath) {
    return (
      <ScrollView
        contentContainerStyle={styles.emptyContent}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <View style={[styles.emptyTray, { backgroundColor: colors.backgroundSecondary }]}>
          <KeyRound color={colors.textTertiary} size={32} strokeWidth={1.8} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Active Project</Text>
          <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
            Select a project to manage its environment variables.
          </Text>
        </View>
      </ScrollView>
    )
  }

  return (
    <>
      <View style={styles.container}>
        <View style={styles.toolbar}>
          <TouchableOpacity
            onPress={handleAdd}
            activeOpacity={0.7}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Plus color={colors.primaryText} size={16} strokeWidth={2.5} />
            <Text style={[styles.addBtnText, { color: colors.primaryText }]}>Add / Import</Text>
          </TouchableOpacity>
        </View>

        {isLoading && envVars.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : error ? (
          <View style={[styles.errorTray, { backgroundColor: colors.errorBackground }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        ) : envVars.length === 0 ? (
          <ScrollView
            contentContainerStyle={styles.emptyContent}
            onScroll={onScroll}
            scrollEventThrottle={16}
          >
            <View style={[styles.emptyTray, { backgroundColor: colors.backgroundSecondary }]}>
              <KeyRound color={colors.textTertiary} size={32} strokeWidth={1.8} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Variables</Text>
              <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
                Tap Add / Import to create variables or paste a .env file.
              </Text>
            </View>
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={styles.listContent}
            onScroll={onScroll}
            scrollEventThrottle={16}
          >
            <View style={[styles.listCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              {envVars.map((item) => (
                <EnvVarRow
                  key={item.id}
                  item={item}
                  onEdit={() => handleEdit(item)}
                  onDelete={() => { void handleDelete(item.id) }}
                />
              ))}
            </View>
          </ScrollView>
        )}
      </View>

      {showEdit && (
        <EnvVarEditSheet
          projectPath={projectPath}
          editTarget={editTarget}
          onDismiss={() => setShowEdit(false)}
        />
      )}
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing[3],
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  addBtnText: {
    ...typeStyles.bodySmall,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTray: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginHorizontal: spacing[1],
  },
  errorText: {
    ...typeStyles.bodySmall,
  },
  listContent: {
    gap: spacing[3],
    paddingBottom: spacing[8],
  },
  listCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: spacing[8],
  },
  emptyTray: {
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    gap: spacing[3],
    alignItems: 'center',
  },
  emptyTitle: {
    ...typeStyles.bodyBold,
    textAlign: 'center',
  },
  emptyBody: {
    ...typeStyles.bodySmall,
    textAlign: 'center',
    maxWidth: 280,
  },
})
