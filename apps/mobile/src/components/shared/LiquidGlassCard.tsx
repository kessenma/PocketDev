import React, { type ReactNode } from 'react'
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'

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
  const { colors, isDark } = useTheme()

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? 'rgba(38, 38, 38, 0.62)' : 'rgba(255, 255, 255, 0.68)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.76)',
          shadowColor: isDark ? '#000000' : colors.primary,
          shadowOpacity: isDark ? 0.34 : 0.16,
          shadowRadius: isDark ? 28 : 24,
          shadowOffset: { width: 0, height: isDark ? 18 : 12 },
          elevation: isDark ? 14 : 10,
        },
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.topSheen,
          { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.86)' },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.primaryGlow,
          { backgroundColor: isDark ? 'rgba(96, 165, 250, 0.16)' : 'rgba(147, 197, 253, 0.24)' },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.accentGlow,
          { backgroundColor: isDark ? 'rgba(168, 85, 247, 0.12)' : 'rgba(196, 181, 253, 0.18)' },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.innerStroke,
          { borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.58)' },
        ]}
      />
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
    borderWidth: 1,
    borderRadius: 24,
    padding: spacing[4],
  },
  body: {
    gap: spacing[3],
    zIndex: 1,
  },
  topSheen: {
    position: 'absolute',
    top: -36,
    left: spacing[3],
    right: spacing[3],
    height: 96,
    borderRadius: borderRadius.full,
    transform: [{ rotate: '-6deg' }],
  },
  primaryGlow: {
    position: 'absolute',
    top: -40,
    right: -36,
    width: 148,
    height: 148,
    borderRadius: borderRadius.full,
  },
  accentGlow: {
    position: 'absolute',
    bottom: -76,
    left: -28,
    width: 132,
    height: 132,
    borderRadius: borderRadius.full,
  },
  innerStroke: {
    position: 'absolute',
    top: 1,
    right: 1,
    bottom: 1,
    left: 1,
    borderWidth: 1,
    borderRadius: 23,
  },
  header: {
    gap: spacing[1],
  },
  title: {
    ...typographyScale.lg,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  description: {
    ...typographyScale.sm,
  },
  content: {
    gap: spacing[3],
  },
})