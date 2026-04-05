import React, { type ReactNode } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { layoutGrid } from '@pocketdev/shared/theme'

type Props = {
  leading: ReactNode
  trailing: ReactNode
  leadingWidth?: number
  style?: StyleProp<ViewStyle>
}

export default function SplitViewLayout({
  leading,
  trailing,
  leadingWidth = 360,
  style,
}: Props) {
  return (
    <View style={[styles.container, style]}>
      <View style={[styles.leading, { width: leadingWidth }]}>{leading}</View>
      <View style={styles.trailing}>{trailing}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    gap: layoutGrid.panelGap,
  },
  leading: {
    flexShrink: 0,
    minWidth: 300,
  },
  trailing: {
    flex: 1,
    minWidth: 0,
  },
})
