import React, { type ReactNode } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { useAdaptiveLayout } from '../../hooks/useAdaptiveLayout'

type Props = {
  children: ReactNode
  maxWidth?: number
  style?: StyleProp<ViewStyle>
  contentStyle?: StyleProp<ViewStyle>
}

export default function AdaptiveShell({
  children,
  maxWidth = 1120,
  style,
  contentStyle,
}: Props) {
  const { colors } = useTheme()
  const { layoutMode } = useAdaptiveLayout()
  const isPhone = layoutMode === 'phone'

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }, style]}>
      <View
        style={[
          styles.content,
          isPhone ? styles.phoneContent : styles.tabletContent,
          !isPhone && { maxWidth },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
  phoneContent: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
  },
  tabletContent: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[6],
  },
})
