import React from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { CircleAlert, type LucideIcon, CheckCircle2, XCircle } from 'lucide-react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../../contexts/ThemeContext'

export type SetupProgressTone = 'running' | 'success' | 'error' | 'warning'

interface Props {
  tone: SetupProgressTone
  message: string
  icon?: LucideIcon
}

export default function SetupProgressCard({ tone, message, icon: Icon }: Props) {
  const { colors } = useTheme()
  const palette = getPalette(tone, colors)
  const ResolvedIcon = Icon ?? getDefaultIcon(tone)

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: palette.border }]}>
      {tone === 'running'
        ? <ActivityIndicator size="small" color={palette.icon} />
        : <ResolvedIcon color={palette.icon} size={18} strokeWidth={2.25} />}
      <Text style={[styles.text, { color: palette.text }]}>{message}</Text>
    </View>
  )
}

function getDefaultIcon(tone: SetupProgressTone): LucideIcon {
  switch (tone) {
    case 'success':
      return CheckCircle2
    case 'warning':
      return CircleAlert
    case 'error':
    default:
      return XCircle
  }
}

function getPalette(tone: SetupProgressTone, colors: ReturnType<typeof useTheme>['colors']) {
  switch (tone) {
    case 'running':
      return { border: colors.primary, icon: colors.primary, text: colors.primary }
    case 'success':
      return { border: '#22c55e', icon: '#22c55e', text: '#22c55e' }
    case 'warning':
      return { border: '#f59e0b', icon: '#f59e0b', text: '#f59e0b' }
    case 'error':
    default:
      return { border: colors.error, icon: colors.error, text: colors.error }
  }
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
  },
  text: {
    ...typographyScale.sm,
    fontWeight: '600',
  },
})
