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
type IconComponent = React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>

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

const ICON_STROKE = 2.25

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

  // Mute both text and icon colors when disabled/loading
  const textColor = inactive ? colors.textTertiary : palette.textColor
  const iconColor = inactive ? colors.textTertiary : palette.iconColor

  if (iconOnly) {
    const iconSizeStyle =
      size === 'sm' ? styles.iconButton_sm : size === 'lg' ? styles.iconButton_lg : styles.iconButton_md

    return (
      <Pressable
        accessibilityRole="button"
        disabled={inactive}
        onPress={onPress}
        style={({ pressed }) => [
          styles.iconButton,
          iconSizeStyle,
          {
            backgroundColor: inactive
              ? colors.backgroundSecondary
              : pressed ? palette.pressedBackgroundColor : palette.backgroundColor,
            borderColor: inactive
              ? colors.border
              : pressed ? palette.pressedBorderColor : palette.borderColor,
          },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={iconColor} />
        ) : (
          <Icon color={iconColor} size={iconSize} strokeWidth={ICON_STROKE} />
        )}
      </Pressable>
    )
  }

  const buttonSizeStyle =
    size === 'sm' ? styles.button_sm : size === 'lg' ? styles.button_lg : styles.button_md

  const hasLeft = loading || !!LeftIcon
  const hasRight = !loading && !!RightIcon
  const spread = hasLeft || hasRight

  return (
    <Pressable
      accessibilityRole="button"
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        buttonSizeStyle,
        {
          backgroundColor: inactive
            ? colors.backgroundSecondary
            : pressed ? palette.pressedBackgroundColor : palette.backgroundColor,
          borderColor: inactive
            ? colors.border
            : pressed ? palette.pressedBorderColor : palette.borderColor,
        },
        style,
      ]}
    >
      <View style={spread ? styles.contentSpread : styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={iconColor} />
        ) : LeftIcon ? (
          <LeftIcon color={iconColor} size={iconSize} strokeWidth={ICON_STROKE} />
        ) : hasRight ? (
          <View style={{ width: iconSize, height: iconSize }} />
        ) : null}
        <Text style={[typeStyles.button, { color: textColor }]}>{children}</Text>
        {RightIcon && !loading ? (
          <RightIcon color={iconColor} size={iconSize} strokeWidth={ICON_STROKE} />
        ) : hasLeft ? (
          <View style={{ width: iconSize, height: iconSize }} />
        ) : null}
      </View>
    </Pressable>
  )
}

interface VariantPalette {
  backgroundColor: string
  borderColor: string
  textColor: string
  iconColor: string
  pressedBackgroundColor: string
  pressedBorderColor: string
}

function getVariantPalette(variant: Variant, colors: ReturnType<typeof useTheme>['colors']): VariantPalette {
  switch (variant) {
    case 'secondary':
      return {
        backgroundColor: colors.panelAlt,
        borderColor: colors.border,
        textColor: colors.text,
        iconColor: colors.primary,          // blue pop on neutral background
        pressedBackgroundColor: colors.primary + '22',
        pressedBorderColor: colors.primary,
      }
    case 'danger':
      return {
        backgroundColor: colors.accentRed,
        borderColor: colors.border,
        textColor: colors.primaryText,
        iconColor: colors.primaryText,      // white on red — max contrast
        pressedBackgroundColor: colors.error,
        pressedBorderColor: colors.border,
      }
    case 'quiet':
      return {
        backgroundColor: 'transparent',
        borderColor: colors.border,
        textColor: colors.text,
        iconColor: colors.primary,          // blue pop on transparent
        pressedBackgroundColor: colors.primary + '18',
        pressedBorderColor: colors.primary,
      }
    default:
      return {
        backgroundColor: colors.primary,
        borderColor: colors.border,
        textColor: colors.primaryText,
        iconColor: colors.primaryText,      // white on blue — max contrast
        pressedBackgroundColor: colors.primaryHover,
        pressedBorderColor: colors.border,
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
  contentSpread: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
})
