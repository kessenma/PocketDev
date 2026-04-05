import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { X } from 'lucide-react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { typeStyles } from '../../theme/typography'

type Props = {
  label: string
  color?: string
  onRemove?: () => void
}

export default function BauhausBadge({ label, color, onRemove }: Props) {
  const { colors } = useTheme()

  return (
    <View style={[styles.badge, { borderColor: colors.border }]}>
      <View style={[styles.marker, { backgroundColor: color ?? colors.accentYellow }]} />
      <Text style={[typeStyles.meta, { color: colors.text }]}>{label}</Text>
      {onRemove ? (
        <TouchableOpacity onPress={onRemove} activeOpacity={0.7} hitSlop={6}>
          <X color={colors.textSecondary} size={12} strokeWidth={2.5} />
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  marker: {
    width: 10,
    height: 10,
  },
})
