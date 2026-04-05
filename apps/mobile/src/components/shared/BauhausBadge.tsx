import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { typeStyles } from '../../theme/typography'

type Props = {
  label: string
  color?: string
}

export default function BauhausBadge({ label, color }: Props) {
  const { colors } = useTheme()

  return (
    <View style={[styles.badge, { borderColor: colors.border }]}>
      <View style={[styles.marker, { backgroundColor: color ?? colors.accentYellow }]} />
      <Text style={[typeStyles.meta, { color: colors.text }]}>{label}</Text>
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
