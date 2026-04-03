import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useConnectionStore } from '../../stores/connection'
import type { DatabaseTemplate, DatabaseInfo, DatabaseCreateRequest } from '@pocketdev/shared/types'

interface Props {
  databases: DatabaseInfo[]
  dockerInstalled: boolean
  onRefresh: () => void
}

export default function DatabaseSetup({ databases, dockerInstalled, onRefresh }: Props) {
  const { colors } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const [templates, setTemplates] = useState<DatabaseTemplate[]>([])
  const [showCreate, setShowCreate] = useState<DatabaseTemplate | null>(null)
  const [creating, setCreating] = useState(false)
  const [dbName, setDbName] = useState('')
  const [dbPort, setDbPort] = useState('')

  // Fetch templates
  useEffect(() => {
    if (!server || !dockerInstalled) return
    fetch(`http://${server.ip}:${server.port}/databases/templates`)
      .then((r) => r.json())
      .then((data) => setTemplates(data as DatabaseTemplate[]))
      .catch(() => {})
  }, [server, dockerInstalled])

  const handleCreate = useCallback(async () => {
    if (!server || !showCreate) return
    setCreating(true)

    const request: DatabaseCreateRequest = {
      type: showCreate.type,
      name: dbName || showCreate.type,
      image: showCreate.default_image,
      port: Number(dbPort) || showCreate.default_port,
      password: '', // auto-generated server-side
      env_vars: { ...showCreate.env_vars },
    }

    try {
      const res = await fetch(`http://${server.ip}:${server.port}/databases/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })
      const data = await res.json() as { container_id?: string; connection_uri?: string; error?: string }

      if (!res.ok) {
        Alert.alert('Error', data.error ?? 'Failed to create database')
      } else {
        Alert.alert(
          'Service Ready',
          `Connection URI:\n${data.connection_uri}`,
          [{ text: 'OK' }],
        )
        setShowCreate(null)
        setDbName('')
        setDbPort('')
        onRefresh()
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Network error')
    } finally {
      setCreating(false)
    }
  }, [server, showCreate, dbName, dbPort, onRefresh])

  const handleAction = useCallback(async (containerId: string, action: 'start' | 'stop') => {
    if (!server) return
    try {
      await fetch(`http://${server.ip}:${server.port}/databases/${action}/${containerId}`, {
        method: 'POST',
      })
      onRefresh()
    } catch {
      // silently fail
    }
  }, [server, onRefresh])

  if (!dockerInstalled) {
    return (
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Workspace Services</Text>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Enable container support first to add project services
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Workspace Services</Text>

      {/* Existing databases */}
      {databases.length > 0 && (
        <View style={styles.dbList}>
          {databases.map((db) => (
            <View
              key={db.id}
              style={[styles.dbCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.dbHeader}>
                <View style={[styles.statusDot, {
                  backgroundColor: db.status === 'running' ? '#22c55e' : '#ef4444',
                }]} />
                <View style={styles.dbInfo}>
                  <Text style={[styles.dbName, { color: colors.text }]}>{db.name}</Text>
                  <Text style={[styles.dbMeta, { color: colors.textSecondary }]}>
                    {db.type} {db.version ? `v${db.version}` : ''} · port {db.port}
                  </Text>
                </View>
              </View>
              <View style={styles.dbActions}>
                {db.status === 'running' ? (
                  <TouchableOpacity
                    style={[styles.smallButton, { backgroundColor: colors.errorBackground }]}
                    onPress={() => handleAction(db.container_id!, 'stop')}
                  >
                    <Text style={[styles.smallButtonText, { color: colors.error }]}>Stop</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.smallButton, { backgroundColor: colors.primary }]}
                    onPress={() => handleAction(db.container_id!, 'start')}
                  >
                    <Text style={[styles.smallButtonText, { color: colors.primaryText }]}>Start</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Template cards for adding databases */}
      {!showCreate && (
        <View style={styles.templateGrid}>
          {templates.map((tmpl) => (
            <TouchableOpacity
              key={tmpl.type}
              style={[styles.templateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => {
                setShowCreate(tmpl)
                setDbPort(String(tmpl.default_port))
                setDbName(tmpl.type)
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.templateName, { color: colors.text }]}>{tmpl.name}</Text>
              <Text style={[styles.templateDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                {tmpl.description}
              </Text>
              <Text style={[styles.templateImage, { color: colors.textTertiary }]}>
                {tmpl.default_image}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Create form */}
      {showCreate && (
        <View style={[styles.createForm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.createTitle, { color: colors.text }]}>
            Add {showCreate.name}
          </Text>

          <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={dbName}
            onChangeText={setDbName}
            placeholder={showCreate.type}
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>Port</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={dbPort}
            onChangeText={setDbPort}
            placeholder={String(showCreate.default_port)}
            placeholderTextColor={colors.textTertiary}
            keyboardType="number-pad"
          />

          <Text style={[styles.hint, { color: colors.textTertiary }]}>
            Runtime: {showCreate.default_image} · Credentials auto-generated
          </Text>

          <View style={styles.createActions}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: colors.background }]}
              onPress={() => setShowCreate(null)}
            >
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: creating ? colors.border : colors.primary }]}
              onPress={handleCreate}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color={colors.primaryText} size="small" />
              ) : (
                <Text style={[styles.createButtonText, { color: colors.primaryText }]}>Create</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing[2],
  },
  section: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[2],
  },
  sectionTitle: {
    ...typographyScale.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: spacing[2],
  },
  hint: {
    ...typographyScale.xs,
  },
  dbList: {
    gap: spacing[2],
  },
  dbCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dbHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dbInfo: {
    flex: 1,
    gap: 1,
  },
  dbName: {
    ...typographyScale.sm,
    fontWeight: '600',
  },
  dbMeta: {
    ...typographyScale.xs,
  },
  dbActions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  smallButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
  },
  smallButtonText: {
    ...typographyScale.xs,
    fontWeight: '600',
  },
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  templateCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    width: '48%',
    gap: spacing[1],
  },
  templateName: {
    ...typographyScale.sm,
    fontWeight: '700',
  },
  templateDesc: {
    ...typographyScale.xs,
  },
  templateImage: {
    ...typographyScale.xs,
    fontFamily: 'monospace',
    marginTop: spacing[1],
  },
  createForm: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[3],
  },
  createTitle: {
    ...typographyScale.lg,
    fontWeight: '700',
  },
  label: {
    ...typographyScale.sm,
    fontWeight: '500',
  },
  input: {
    ...typographyScale.base,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  createActions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[1],
  },
  cancelButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  cancelText: {
    ...typographyScale.sm,
    fontWeight: '600',
  },
  createButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  createButtonText: {
    ...typographyScale.sm,
    fontWeight: '600',
  },
})
