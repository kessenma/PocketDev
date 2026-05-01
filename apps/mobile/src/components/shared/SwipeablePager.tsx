import React, { useCallback, useState, type ReactNode } from 'react'
import { Animated, StyleSheet, View } from 'react-native'
import ReanimatedLib, {
  useSharedValue,
  useAnimatedScrollHandler,
  useDerivedValue,
  scrollTo as reanimatedScrollTo,
  useAnimatedRef,
  runOnUI,
} from 'react-native-reanimated'
import { spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import PagerIndicator, { type PageMeta } from './PagerIndicator'

type Props = {
  pages: PageMeta[]
  children: ReactNode[]
  scrollY?: Animated.Value
  onPageChange?: (index: number) => void
}

export default function SwipeablePager({ pages, children, scrollY, onPageChange }: Props) {
  const { colors } = useTheme()
  const scrollRef = useAnimatedRef<ReanimatedLib.ScrollView>()
  const scrollX = useSharedValue(0)
  const [pageWidth, setPageWidth] = useState(0)

  const activeIndex = useDerivedValue(() => {
    if (pageWidth === 0) return 0
    return scrollX.value / pageWidth
  })

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x
    },
  })

  // Compact interpolation for indicator label collapse (0 = full, 1 = icons only)
  const compact = scrollY?.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })

  const indicatorHeight = scrollY?.interpolate({
    inputRange: [0, 80],
    outputRange: [60, 40],
    extrapolate: 'clamp',
  }) ?? 60

  const handleIndicatorPress = useCallback(
    (index: number) => {
      if (pageWidth > 0) {
        const targetX = index * pageWidth
        runOnUI(() => {
          'worklet'
          reanimatedScrollTo(scrollRef, targetX, 0, true)
        })()
      }
      onPageChange?.(index)
    },
    [pageWidth, scrollRef, onPageChange],
  )

  const handleScrollEnd = useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      if (pageWidth > 0) {
        const newIndex = Math.round(event.nativeEvent.contentOffset.x / pageWidth)
        onPageChange?.(newIndex)
      }
    },
    [pageWidth, onPageChange],
  )

  const handleLayout = useCallback(
    (event: { nativeEvent: { layout: { width: number } } }) => {
      setPageWidth(event.nativeEvent.layout.width)
    },
    [],
  )

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {pageWidth > 0 && (
        <ReanimatedLib.ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          bounces={false}
          onMomentumScrollEnd={handleScrollEnd}
          style={styles.scrollView}
        >
          {children.map((child, i) => (
            <View key={pages[i]?.label ?? i} style={[styles.page, { width: pageWidth }]}>
              {child}
            </View>
          ))}
        </ReanimatedLib.ScrollView>
      )}

      <Animated.View style={[styles.indicatorWrap, { height: indicatorHeight }]}>
        <PagerIndicator
          pages={pages}
          activeIndex={activeIndex}
          compact={compact}
          onPress={handleIndicatorPress}
        />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing[3],
  },
  scrollView: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  indicatorWrap: {
    overflow: 'hidden',
  },
})
