import React, { type ReactNode } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { typeStyles } from '../../theme/typography'

type Variant = 'primary' | 'secondary' | 'danger' | 'quiet'
type Size = 'sm' | 'md' | 'lg'
type IconComponent = React.ComponentType<{ color?: string; size?: number }>

type Props = {
  children?: ReactNode
  onPress?: () => void
  disabled?: boolean
  loading?: boolean
  variant?: Variant
  size?: Size
  leftIcon?: IconComponent
  rightIcon?: IconComponent
  icon?: IconComponent
  style?: StyleProp<ViewStyle>
}

export function Button({
  children,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'md',
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  icon: Icon,
  style,
}: Props) {
  const { colors } = useTheme()
  const palette = getVariantPalette(variant, colors)
  const inactive = disabled || loading
  const iconOnly = Icon != null && !children
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16

  if (iconOnly) {
    const iconSizeStyle =
      size === 'sm' ? styles.iconButton_sm : size === 'lg' ? styles.iconButton_lg : styles.iconButton_md

    return (
      <Pressable
        accessibilityRole="button"
        disabled={inactive}
        onPress={onPress}
        style={[
          styles.iconButton,
          iconSizeStyle,
          {
            backgroundColor: inactive ? colors.backgroundSecondary : palette.backgroundColor,
            borderColor: palette.borderColor,
          },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={palette.textColor} />
        ) : (
          <Icon color={palette.textColor} size={iconSize} />
        )}
      </Pressable>
    )
  }

  const buttonSizeStyle =
    size === 'sm' ? styles.button_sm : size === 'lg' ? styles.button_lg : styles.button_md

  return (
    <Pressable
      accessibilityRole="button"
      disabled={inactive}
      onPress={onPress}
      style={[
        styles.button,
        buttonSizeStyle,
        {
          backgroundColor: inactive ? colors.backgroundSecondary : palette.backgroundColor,
          borderColor: palette.borderColor,
        },
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={palette.textColor} />
        ) : LeftIcon ? (
          <LeftIcon color={palette.textColor} size={iconSize} />
        ) : null}
        <Text style={[typeStyles.button, { color: palette.textColor }]}>{children}</Text>
        {RightIcon && !loading ? <RightIcon color={palette.textColor} size={iconSize} /> : null}
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
        backgroundColor: 'transparent' as const,
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
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
  },
  button_sm: {
    minHeight: 32,
    paddingHorizontal: spacing[3],
  },
  button_md: {
    minHeight: 44,
    paddingHorizontal: spacing[4],
  },
  button_lg: {
    minHeight: 52,
    paddingHorizontal: spacing[5],
  },
  iconButton: {
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton_sm: {
    width: 28,
    height: 28,
  },
  iconButton_md: {
    width: 36,
    height: 36,
  },
  iconButton_lg: {
    width: 44,
    height: 44,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
})
