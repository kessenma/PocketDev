import React from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Play, Square, Eye } from 'lucide-react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'

type Props = {
  name: string
  command: string
  isRunning: boolean
  detectedPort: number | null
  onRun: () => void
  onStop: () => void
  onPreview: (port: number) => void
}

export default function ScriptCard({
  name,
  command,
  isRunning,
  detectedPort,
  onRun,
  onStop,
  onPreview,
}: Props) {
  const { colors } = useTheme()

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
        <Text style={[styles.command, { color: colors.textSecondary }]} numberOfLines={1}>
          {command}
        </Text>
      </View>

      <View style={styles.actions}>
        {detectedPort != null && (
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.7}
            onPress={() => onPreview(detectedPort)}
            style={[styles.previewButton, { backgroundColor: colors.accentBlue }]}
          >
            <Eye color={colors.primaryText} size={14} strokeWidth={2.5} />
            <Text style={[styles.buttonText, { color: colors.primaryText }]}>Preview</Text>
          </TouchableOpacity>
        )}

        {isRunning ? (
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.7}
            onPress={onStop}
            style={[styles.actionButton, { backgroundColor: colors.accentRed }]}
          >
            {detectedPort == null ? (
              <ActivityIndicator color={colors.primaryText} size="small" />
            ) : (
              <Square color={colors.primaryText} size={14} strokeWidth={2.5} />
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.7}
            onPress={onRun}
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
          >
            <Play color={colors.primaryText} size={14} strokeWidth={2.5} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[3],
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    ...typographyScale.base,
    fontWeight: '700',
  },
  command: {
    ...typographyScale.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[2],
    height: 36,
  },
  buttonText: {
    ...typographyScale.xs,
    fontWeight: '700',
  },
})
