import React, { useCallback, useState } from 'react'
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native'
import type { LucideIcon } from 'lucide-react-native'
import ReanimatedLib, {
  useAnimatedStyle,
  interpolate,
  type SharedValue,
} from 'react-native-reanimated'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { typeStyles } from '../../theme/typography'

export type PageMeta = {
  label: string
  title: string
  icon: LucideIcon
  accentColor: string
}

type Props = {
  pages: PageMeta[]
  activeIndex: SharedValue<number>
  onPress: (index: number) => void
  /** Animated interpolation 0→1 where 1 = fully compact (icons only, shorter height) */
  compact?: Animated.AnimatedInterpolation<number>
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)

function IndicatorItem({
  page,
  index,
  activeIndex,
  compact,
  onPress,
}: {
  page: PageMeta
  index: number
  activeIndex: SharedValue<number>
  compact?: Animated.AnimatedInterpolation<number>
  onPress: () => void
}) {
  const { colors } = useTheme()
  const Icon = page.icon

  // Reanimated — active state colors driven by swipe position
  const markerColor = useAnimatedStyle(() => {
    const p = interpolate(activeIndex.value, [index - 0.5, index, index + 0.5], [0, 1, 0], 'clamp')
    return { backgroundColor: p > 0.5 ? page.accentColor : colors.panelAlt }
  })

  const textColor = useAnimatedStyle(() => {
    const p = interpolate(activeIndex.value, [index - 0.5, index, index + 0.5], [0, 1, 0], 'clamp')
    return { color: p > 0.5 ? colors.text : colors.textTertiary }
  })

  const iconOpacityStyle = useAnimatedStyle(() => {
    const p = interpolate(activeIndex.value, [index - 0.5, index, index + 0.5], [0, 1, 0], 'clamp')
    return { opacity: p > 0.5 ? 1 : 0.45 }
  })

  // RN Animated — height + label collapse driven by scroll
  const itemPadV = compact
    ? compact.interpolate({ inputRange: [0, 1], outputRange: [spacing[3], spacing[2]], extrapolate: 'clamp' })
    : spacing[3]

  const labelMaxWidth = compact
    ? compact.interpolate({ inputRange: [0, 0.7], outputRange: [160, 0], extrapolate: 'clamp' })
    : 160

  const labelOpacity = compact
    ? compact.interpolate({ inputRange: [0, 0.4], outputRange: [1, 0], extrapolate: 'clamp' })
    : 1

  const labelGap = compact
    ? compact.interpolate({ inputRange: [0, 0.7], outputRange: [spacing[2], 0], extrapolate: 'clamp' })
    : spacing[2]

  return (
    <AnimatedTouchable
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.item, { paddingVertical: itemPadV, gap: labelGap }]}
    >
      {/* Icon — always visible, reanimated drives active opacity */}
      <ReanimatedLib.View style={iconOpacityStyle}>
        <Icon size={16} strokeWidth={2.25} color={colors.text} />
      </ReanimatedLib.View>

      {/* Marker + label — collapses horizontally then item shrinks vertically */}
      <Animated.View
        style={{
          maxWidth: labelMaxWidth,
          opacity: labelOpacity,
          overflow: 'hidden',
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[2],
        }}
      >
        <ReanimatedLib.View style={[styles.marker, markerColor]} />
        <ReanimatedLib.Text style={[typeStyles.meta, textColor]} numberOfLines={1}>
          {page.label}
        </ReanimatedLib.Text>
      </Animated.View>
    </AnimatedTouchable>
  )
}

export default function PagerIndicator({ pages, activeIndex, onPress, compact }: Props) {
  const { colors } = useTheme()
  const [itemLayouts, setItemLayouts] = useState<{ x: number; width: number }[]>([])

  const handleItemLayout = useCallback(
    (index: number, x: number, width: number) => {
      setItemLayouts((prev) => {
        const next = [...prev]
        next[index] = { x, width }
        return next
      })
    },
    [],
  )

  const allMeasured = itemLayouts.length === pages.length && itemLayouts.every(Boolean)

  const slidingPillStyle = useAnimatedStyle(() => {
    if (!allMeasured) return { opacity: 0 }
    const indices = pages.map((_, i) => i)
    const xValues = itemLayouts.map((l) => l.x)
    const wValues = itemLayouts.map((l) => l.width)
    return {
      opacity: 1,
      transform: [{ translateX: interpolate(activeIndex.value, indices, xValues, 'clamp') }],
      width: interpolate(activeIndex.value, indices, wValues, 'clamp'),
    }
  })

  return (
    <View style={[styles.container, { backgroundColor: colors.panel, borderColor: colors.border }]}>
      {/* Sliding pill background */}
      <ReanimatedLib.View
        style={[
          styles.slidingPill,
          { backgroundColor: colors.panelAlt, borderColor: colors.border },
          slidingPillStyle,
        ]}
      />

      {pages.map((page, i) => (
        <View
          key={page.label}
          style={styles.itemWrapper}
          onLayout={(e) => handleItemLayout(i, e.nativeEvent.layout.x, e.nativeEvent.layout.width)}
        >
          <IndicatorItem
            page={page}
            index={i}
            activeIndex={activeIndex}
            compact={compact}
            onPress={() => onPress(i)}
          />
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    padding: spacing[1],
    gap: spacing[1],
  },
  slidingPill: {
    position: 'absolute',
    top: spacing[1],
    left: 0,
    bottom: spacing[1],
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
  },
  itemWrapper: {
    flex: 1,
  },
  item: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
  },
  marker: {
    width: 8,
    height: 8,
  },
})
