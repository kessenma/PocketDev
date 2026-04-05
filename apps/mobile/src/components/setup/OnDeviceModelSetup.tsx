import React, { useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { Cpu, Check, Download, X } from 'lucide-react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale, palette } from '@pocketdev/shared/theme'
import { useOnDeviceAIStore } from '../../stores/on-device-ai'
import { MODEL_NAME, MODEL_SIZE_MB } from '../../services/embedding'

export default function OnDeviceModelSetup() {
  const { colors } = useTheme()
  const bauhaus = palette.bauhaus
  const modelStatus = useOnDeviceAIStore((s) => s.modelStatus)
  const downloadProgress = useOnDeviceAIStore((s) => s.downloadProgress)
  const downloadModel = useOnDeviceAIStore((s) => s.downloadModel)
  const hydrate = useOnDeviceAIStore((s) => s.hydrate)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  // Auto-download since the model is only 25MB
  useEffect(() => {
    if (modelStatus === 'not_downloaded') {
      downloadModel()
    }
  }, [modelStatus, downloadModel])

  const isReady = modelStatus === 'downloaded' || modelStatus === 'ready'
  const isDownloading = modelStatus === 'downloading'

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>On-Device AI</Text>
      <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
        Suggests relevant files when creating tasks.
      </Text>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.row}>
          <View style={[styles.iconContainer, { backgroundColor: isReady ? bauhaus.blue + '18' : colors.background }]}>
            <Cpu color={isReady ? bauhaus.blue : colors.textTertiary} size={20} strokeWidth={2.2} />
          </View>
          <View style={styles.info}>
            <Text style={[styles.modelName, { color: colors.text }]}>{MODEL_NAME}</Text>
            <Text style={[styles.modelMeta, { color: colors.textSecondary }]}>
              {MODEL_SIZE_MB} MB · Embedding model
            </Text>
          </View>
          <View style={styles.statusArea}>
            {isReady ? (
              <View style={[styles.statusBadge, { backgroundColor: '#22c55e' + '20' }]}>
                <Check color="#22c55e" size={14} strokeWidth={2.5} />
                <Text style={[styles.statusText, { color: '#22c55e' }]}>Ready</Text>
              </View>
            ) : isDownloading ? (
              <View style={styles.progressRow}>
                <ActivityIndicator size="small" color={bauhaus.blue} />
                <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                  {Math.round(downloadProgress * 100)}%
                </Text>
              </View>
            ) : modelStatus === 'error' ? (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: bauhaus.blue }]}
                onPress={downloadModel}
                activeOpacity={0.7}
              >
                <Download color="#ffffff" size={14} strokeWidth={2.2} />
                <Text style={[styles.actionText, { color: '#ffffff' }]}>Retry</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: bauhaus.blue }]}
                onPress={downloadModel}
                activeOpacity={0.7}
              >
                <Download color="#ffffff" size={14} strokeWidth={2.2} />
                <Text style={[styles.actionText, { color: '#ffffff' }]}>Download</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing[2],
  },
  sectionTitle: {
    ...typographyScale.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: spacing[2],
  },
  sectionHint: {
    ...typographyScale.sm,
    marginTop: -spacing[1],
    marginBottom: spacing[1],
  },
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  modelName: {
    ...typographyScale.sm,
    fontWeight: '700',
  },
  modelMeta: {
    ...typographyScale.xs,
  },
  statusArea: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  statusText: {
    ...typographyScale.xs,
    fontWeight: '700',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  progressText: {
    ...typographyScale.xs,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  actionText: {
    ...typographyScale.xs,
    fontWeight: '700',
  },
})
