import React, { type ReactNode } from 'react'
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { typeStyles } from '../../theme/typography'

type CardProps = {
  children: ReactNode
  style?: StyleProp<ViewStyle>
}

type TextProps = {
  children: ReactNode
  style?: StyleProp<TextStyle>
}

type ViewProps = {
  children: ReactNode
  style?: StyleProp<ViewStyle>
}

export function LiquidGlassCard({ children, style }: CardProps) {
  const { colors } = useTheme()

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.panel,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <View pointerEvents="none" style={[styles.accentBlock, { backgroundColor: colors.accentYellow }]} />
      <View style={styles.body}>{children}</View>
    </View>
  )
}

export function LiquidGlassCardHeader({ children, style }: ViewProps) {
  return <View style={[styles.header, style]}>{children}</View>
}

export function LiquidGlassCardTitle({ children, style }: TextProps) {
  const { colors } = useTheme()

  return <Text style={[styles.title, { color: colors.text }, style]}>{children}</Text>
}

export function LiquidGlassCardDescription({ children, style }: TextProps) {
  const { colors } = useTheme()

  return <Text style={[styles.description, { color: colors.textSecondary }, style]}>{children}</Text>
}

export function LiquidGlassCardContent({ children, style }: ViewProps) {
  return <View style={[styles.content, style]}>{children}</View>
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 2,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
  },
  body: {
    gap: spacing[3],
    zIndex: 1,
  },
  accentBlock: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 18,
    height: 18,
  },
  header: {
    gap: spacing[1],
  },
  title: {
    ...typeStyles.screenTitle,
  },
  description: {
    ...typeStyles.bodySmall,
  },
  content: {
    gap: spacing[3],
  },
})
