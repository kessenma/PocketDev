import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Download, KeyRound, Plus } from 'lucide-react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import type { EnvVar } from '@pocketdev/shared/types'
import { useTheme } from '../../../contexts/ThemeContext'
import { useEnvStore } from '../../../stores/env'
import { useProjectsStore } from '../../../stores/projects'
import EnvVarRow from './EnvVarRow'
import EnvVarEditSheet from './EnvVarEditSheet'
import DotEnvImportSheet from './DotEnvImportSheet'
import type { CodeScreenTabProps } from '../navigation/types'

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
  const [showImport, setShowImport] = useState(false)

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
        <View style={[styles.toolbar, { borderColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => setShowImport(true)}
            activeOpacity={0.7}
            style={[styles.toolbarBtn, { borderColor: colors.border }]}
          >
            <Download color={colors.textSecondary} size={16} strokeWidth={2.2} />
            <Text style={[styles.toolbarBtnText, { color: colors.textSecondary }]}>Import .env</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleAdd}
            activeOpacity={0.7}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Plus color={colors.primaryText} size={16} strokeWidth={2.5} />
            <Text style={[styles.addBtnText, { color: colors.primaryText }]}>Add</Text>
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
                Tap Add to create your first environment variable, or import from a .env file.
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

      <EnvVarEditSheet
        visible={showEdit}
        projectPath={projectPath}
        editTarget={editTarget}
        onClose={() => setShowEdit(false)}
      />

      <DotEnvImportSheet
        visible={showImport}
        projectPath={projectPath}
        onClose={() => setShowImport(false)}
      />
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
    gap: spacing[2],
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  toolbarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  toolbarBtnText: {
    ...typographyScale.sm,
    fontWeight: '600',
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
    ...typographyScale.sm,
    fontWeight: '700',
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
    ...typographyScale.sm,
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
    ...typographyScale.base,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyBody: {
    ...typographyScale.sm,
    textAlign: 'center',
    maxWidth: 280,
  },
})
