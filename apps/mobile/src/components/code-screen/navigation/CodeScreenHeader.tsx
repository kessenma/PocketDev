import React, { type ReactNode } from 'react'
import { Animated, StyleSheet, View } from 'react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../../contexts/ThemeContext'

type Props = {
  children: ReactNode
  style?: any
}

export default function CodeScreenHeader({ children, style }: Props) {
  const { colors, isDark } = useTheme()
  const AnimatedView = ((Animated as any) ?? {}).View ?? View

  return (
    <AnimatedView
      style={[
        styles.headerCard,
        {
          backgroundColor: isDark ? 'rgba(14, 14, 14, 0.9)' : 'rgba(250, 248, 242, 0.96)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(26, 26, 26, 0.08)',
        },
        style,
      ]}
    >
      {children}
    </AnimatedView>
  )
}

const styles = StyleSheet.create({
  headerCard: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: spacing[3],
    paddingTop: spacing[3],
    paddingBottom: spacing[3],
    gap: spacing[3],
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
})
