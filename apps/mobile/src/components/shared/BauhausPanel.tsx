import React, { type ReactNode } from 'react'
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { typeStyles } from '../../theme/typography'

type PanelProps = {
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

export function BauhausPanel({ children, style, accentColor, alt = false }: PanelProps) {
  const { colors } = useTheme()

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: alt ? colors.panelAlt : colors.panel,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <View style={[styles.accentBlock, { backgroundColor: accentColor ?? colors.accentYellow }]} />
      {children}
    </View>
  )
}

export function BauhausPanelHeader({ children, style }: SectionProps) {
  return <View style={[styles.header, style]}>{children}</View>
}

export function BauhausPanelTitle({ children, style }: TextProps) {
  const { colors } = useTheme()
  return <Text style={[typeStyles.screenTitle, { color: colors.text }, style]}>{children}</Text>
}

export function BauhausPanelDescription({ children, style }: TextProps) {
  const { colors } = useTheme()
  return <Text style={[typeStyles.bodySmall, { color: colors.textSecondary }, style]}>{children}</Text>
}

export function BauhausPanelContent({ children, style }: SectionProps) {
  return <View style={[styles.content, style]}>{children}</View>
}

const styles = StyleSheet.create({
  panel: {
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
  content: {
    gap: spacing[3],
  },
})
