import React, { type ReactNode } from 'react'
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { typeStyles } from '../../theme/typography'

type CardProps = {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  accentColor?: string
  alt?: boolean
}

type SectionProps = {
  children: ReactNode
  style?: StyleProp<ViewStyle>
}

type TextProps = {
  children: ReactNode
  style?: StyleProp<TextStyle>
}

export function Card({ children, style, accentColor, alt = false }: CardProps) {
  const { colors } = useTheme()

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: alt ? colors.panelAlt : colors.panel,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <View pointerEvents="none" style={[styles.accentBlock, { backgroundColor: accentColor ?? colors.accentYellow }]} />
      {children}
    </View>
  )
}

export function CardHeader({ children, style }: SectionProps) {
  return <View style={[styles.header, style]}>{children}</View>
}

export function CardTitle({ children, style }: TextProps) {
  const { colors } = useTheme()
  return <Text style={[styles.title, { color: colors.text }, style]}>{children}</Text>
}

export function CardDescription({ children, style }: TextProps) {
  const { colors } = useTheme()
  return <Text style={[styles.description, { color: colors.textSecondary }, style]}>{children}</Text>
}

export function CardContent({ children, style }: SectionProps) {
  return <View style={[styles.content, style]}>{children}</View>
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 2,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    gap: spacing[3],
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
