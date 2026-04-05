import React, { type ReactNode } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { typeStyles } from '../../theme/typography'

type Variant = 'primary' | 'secondary' | 'danger' | 'quiet'

type Props = {
  children: ReactNode
  onPress?: () => void
  disabled?: boolean
  loading?: boolean
  variant?: Variant
  compact?: boolean
}

export default function BauhausButton({
  children,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  compact = false,
}: Props) {
  const { colors } = useTheme()
  const palette = getVariantPalette(variant, colors)
  const inactive = disabled || loading

  return (
    <Pressable
      accessibilityRole="button"
      disabled={inactive}
      onPress={onPress}
      style={[
        styles.button,
        compact && styles.compact,
        {
          backgroundColor: inactive ? colors.backgroundSecondary : palette.backgroundColor,
          borderColor: palette.borderColor,
        },
      ]}
    >
      <View style={styles.content}>
        {loading ? <ActivityIndicator size="small" color={palette.textColor} /> : null}
        <Text style={[typeStyles.button, { color: palette.textColor }]}>{children}</Text>
      </View>
    </Pressable>
  )
}

function getVariantPalette(variant: Variant, colors: ReturnType<typeof useTheme>['colors']) {
  switch (variant) {
    case 'secondary':
      return {
        backgroundColor: colors.panelAlt,
        borderColor: colors.border,
        textColor: colors.text,
      }
    case 'danger':
      return {
        backgroundColor: colors.accentRed,
        borderColor: colors.border,
        textColor: colors.primaryText,
      }
    case 'quiet':
      return {
        backgroundColor: 'transparent',
        borderColor: colors.border,
        textColor: colors.text,
      }
    default:
      return {
        backgroundColor: colors.primary,
        borderColor: colors.border,
        textColor: colors.primaryText,
      }
  }
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    justifyContent: 'center',
  },
  compact: {
    minHeight: 38,
    paddingHorizontal: spacing[3],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
})
