import React from 'react'
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'

type Variant = 'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'outline'

type Props = {
  children: React.ReactNode
  variant?: Variant
  style?: StyleProp<ViewStyle>
  textStyle?: StyleProp<TextStyle>
}

export default function PlanBadge({ children, variant = 'neutral', style, textStyle }: Props) {
  const { colors } = useTheme()
  const palette = getVariantPalette(variant, colors)

  return (
    <View style={[styles.badge, palette.container, style]}>
      <Text style={[styles.text, palette.text, textStyle]}>{children}</Text>
    </View>
  )
}

function getVariantPalette(variant: Variant, colors: ReturnType<typeof useTheme>['colors']) {
  switch (variant) {
    case 'primary':
      return {
        container: { backgroundColor: colors.primary },
        text: { color: colors.primaryText },
      }
    case 'success':
      return {
        container: { backgroundColor: colors.successBackground },
        text: { color: colors.success },
      }
    case 'warning':
      return {
        container: { backgroundColor: colors.warningBackground },
        text: { color: colors.warning },
      }
    case 'error':
      return {
        container: { backgroundColor: colors.errorBackground },
        text: { color: colors.error },
      }
    case 'outline':
      return {
        container: {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.border,
        },
        text: { color: colors.textSecondary },
      }
    default:
      return {
        container: { backgroundColor: colors.backgroundSecondary },
        text: { color: colors.textSecondary },
      }
  }
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  text: {
    ...typographyScale.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
})
