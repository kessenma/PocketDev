import React, { type ReactNode } from 'react'
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { typeStyles } from '../../theme/typography'

type CardProps = {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  accentColor?: string
}

type SectionProps = {
  children: ReactNode
  style?: StyleProp<ViewStyle>
}

type TextProps = {
  children: ReactNode
  style?: StyleProp<TextStyle>
  align?: 'left' | 'center' | 'right'
  icon?: ReactNode
}

export function Card({ children, style, accentColor }: CardProps) {
  const { colors } = useTheme()
  const bracketColor = accentColor ?? colors.accentYellow

  return (
    <View
      style={[
        styles.card,
        style,
      ]}
    >
      <View pointerEvents="none" style={[styles.corner, styles.cornerTL, { borderColor: bracketColor }]} />
      <View pointerEvents="none" style={[styles.corner, styles.cornerTR, { borderColor: bracketColor }]} />
      <View pointerEvents="none" style={[styles.corner, styles.cornerBL, { borderColor: bracketColor }]} />
      <View pointerEvents="none" style={[styles.corner, styles.cornerBR, { borderColor: bracketColor }]} />
      {children}
    </View>
  )
}

export function CardHeader({ children, style }: SectionProps) {
  return <View style={[styles.header, style]}>{children}</View>
}

export function CardTitle({ children, style, align = 'center', icon }: TextProps) {
  const { colors } = useTheme()
  const text = (
    <Text style={[styles.title, { color: colors.text, textAlign: align }, style]}>
      {children}
    </Text>
  )
  if (icon) {
    return <View style={styles.titleRow}>{icon}{text}</View>
  }
  return text
}

export function CardDescription({ children, style }: TextProps) {
  const { colors } = useTheme()
  return <Text style={[styles.description, { color: colors.textSecondary }, style]}>{children}</Text>
}

export function CardContent({ children, style }: SectionProps) {
  return <View style={[styles.content, style]}>{children}</View>
}

const BRACKET_SIZE = 32
const BRACKET_THICKNESS = 2
const BRACKET_INSET = 10

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: borderRadius.xl,
    paddingTop: spacing[1],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
    gap: spacing[3],
  },
  corner: {
    position: 'absolute',
    width: BRACKET_SIZE,
    height: BRACKET_SIZE,
  },
  cornerTL: {
    top: BRACKET_INSET,
    left: BRACKET_INSET,
    borderTopWidth: BRACKET_THICKNESS,
    borderLeftWidth: BRACKET_THICKNESS,
  },
  cornerTR: {
    top: BRACKET_INSET,
    right: BRACKET_INSET,
    borderTopWidth: BRACKET_THICKNESS,
    borderRightWidth: BRACKET_THICKNESS,
  },
  cornerBL: {
    bottom: BRACKET_INSET,
    left: BRACKET_INSET,
    borderBottomWidth: BRACKET_THICKNESS,
    borderLeftWidth: BRACKET_THICKNESS,
  },
  cornerBR: {
    bottom: BRACKET_INSET,
    right: BRACKET_INSET,
    borderBottomWidth: BRACKET_THICKNESS,
    borderRightWidth: BRACKET_THICKNESS,
  },
  header: {
    gap: spacing[1],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  title: {
    ...typeStyles.cardTitle,
  },
  description: {
    ...typeStyles.bodySmall,
  },
  content: {
    gap: spacing[3],
  },
})
