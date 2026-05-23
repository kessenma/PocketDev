import React, { useState, type ReactNode } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import ReanimatedLib from 'react-native-reanimated'

// Must be >= the scrollY upper bound in ShrinkableHeader's animations (~120) plus a small buffer
const SHRINK_THRESHOLD = 130

type Props = {
  children: ReactNode
  onScroll?: (...args: any[]) => void
  style?: StyleProp<ViewStyle>
  contentContainerStyle?: StyleProp<ViewStyle>
  /** Minimum bottom padding even when content is already long enough to scroll */
  minPaddingBottom?: number
  showsVerticalScrollIndicator?: boolean
}

export default function TabScrollContainer({
  children,
  onScroll,
  style,
  contentContainerStyle,
  minPaddingBottom = 0,
  showsVerticalScrollIndicator = false,
}: Props) {
  const [containerHeight, setContainerHeight] = useState(0)
  const [naturalContentHeight, setNaturalContentHeight] = useState(0)

  // Ensure content is always scrollable enough to collapse ShrinkableHeader.
  // We measure naturalContentHeight from an inner View rather than onContentSizeChange
  // to avoid a feedback loop where adding paddingBottom triggers another size update.
  const extraPadding = Math.max(
    minPaddingBottom,
    containerHeight + SHRINK_THRESHOLD - naturalContentHeight,
  )

  return (
    <ReanimatedLib.ScrollView
      style={style}
      contentContainerStyle={[contentContainerStyle, { paddingBottom: extraPadding }]}
      onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
      onScroll={onScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
    >
      <View onLayout={(e) => setNaturalContentHeight(e.nativeEvent.layout.height)}>
        {children}
      </View>
    </ReanimatedLib.ScrollView>
  )
}
