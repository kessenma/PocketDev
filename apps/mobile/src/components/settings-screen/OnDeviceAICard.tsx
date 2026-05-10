import React, { useEffect } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { ArrowDownToLine, Cpu, FileSearch, Trash2 } from 'lucide-react-native'
import { spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { useOnDeviceAIStore } from '../../stores/on-device-ai'
import { MODEL_NAME, MODEL_SIZE_MB } from '../../services/embedding'
import { Card, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import Badge from '../ui/Badge'
import { typeStyles } from '../../theme/typography'

export default function OnDeviceAICard() {
  const { colors } = useTheme()
  const modelStatus = useOnDeviceAIStore((s) => s.modelStatus)
  const downloadProgress = useOnDeviceAIStore((s) => s.downloadProgress)
  const downloadModel = useOnDeviceAIStore((s) => s.downloadModel)
  const deleteModel = useOnDeviceAIStore((s) => s.deleteModel)
  const hydrate = useOnDeviceAIStore((s) => s.hydrate)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  const isReady = modelStatus === 'downloaded' || modelStatus === 'ready'
  const isDownloading = modelStatus === 'downloading'

  const statusColor = isReady
    ? colors.accentGreen
    : isDownloading
      ? colors.warning
      : colors.accentRed

  const statusLabel = isReady
    ? 'Ready'
    : isDownloading
      ? `Downloading ${Math.round(downloadProgress * 100)}%`
      : modelStatus === 'error'
        ? 'Error'
        : 'Not Downloaded'

  return (
    <Card style={styles.card} accentColor={colors.bracketAccent}>
      <CardTitle>On-Device AI</CardTitle>

      <View style={styles.row}>
        <View style={styles.labelRow}>
          <Cpu size={14} color={colors.textSecondary} strokeWidth={2} />
          <Text style={[styles.label, { color: colors.textSecondary }]}>Model</Text>
        </View>
        <Text style={[styles.value, { color: colors.text }]}>
          {MODEL_NAME} · {MODEL_SIZE_MB} MB
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Status</Text>
        <View style={styles.statusRow}>
          {isDownloading && <ActivityIndicator size="small" color={colors.primary} />}
          <Badge label={statusLabel} color={statusColor} />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.labelRow}>
          <FileSearch size={14} color={colors.textSecondary} strokeWidth={2} />
          <Text style={[styles.label, { color: colors.textSecondary }]}>Purpose</Text>
        </View>
        <Text style={[styles.value, { color: colors.text }]}>File suggestions</Text>
      </View>

      {isReady ? (
        <Button variant="danger" leftIcon={Trash2} onPress={deleteModel}>
          Remove Model
        </Button>
      ) : !isDownloading ? (
        <Button leftIcon={ArrowDownToLine} onPress={downloadModel}>
          Download Model
        </Button>
      ) : null}
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    gap: spacing[3],
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  label: {
    ...typeStyles.bodySmall,
  },
  value: {
    ...typeStyles.bodyStrong,
    flexShrink: 1,
    textAlign: 'right',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
})
