import React, { useEffect } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native'
import ReanimatedLib, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  type SharedValue,
} from 'react-native-reanimated'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../../contexts/ThemeContext'
import type { CodeSubTabOption } from './types'
import { typeStyles } from '../../../theme/typography'

const EXPANDED_SEGMENT_HEIGHT = spacing[10]
const COMPACT_SEGMENT_HEIGHT = spacing[8]
const SEGMENT_H_PAD = spacing[2]
const SEGMENT_GAP = 2
const AnimatedTouchableOpacity = ReanimatedLib.createAnimatedComponent(TouchableOpacity)

// ---------------------------------------------------------------------------
// Per-segment item
// ---------------------------------------------------------------------------

type SegmentProps<T extends string> = {
  option: CodeSubTabOption<T>
  selected: boolean
  compact: SharedValue<number> | undefined
  labelMode: 'all' | 'active-only'
  variant: 'pill' | 'segmented'
  onChange: (value: T) => void
  textColor: string
  secondaryColor: string
  onLayout: (x: number, width: number) => void
}

function Segment<T extends string>({
  option,
  selected,
  compact,
  labelMode,
  variant,
  onChange,
  textColor,
  secondaryColor,
  onLayout,
}: SegmentProps<T>) {
  const Icon = option.icon
  const activeAnim = useSharedValue(selected ? 1 : 0)

  useEffect(() => {
    activeAnim.value = withSpring(selected ? 1 : 0, {
      damping: 16,
      stiffness: 260,
      mass: 0.7,
    })
  }, [activeAnim, selected])

  const segmentAnimStyle = useAnimatedStyle(() => {
    const padH = compact
      ? interpolate(compact.value, [0, 1], [SEGMENT_H_PAD, 0], 'clamp')
      : SEGMENT_H_PAD
    const gap = compact
      ? interpolate(compact.value, [0, 0.8], [6, 0], 'clamp')
      : 6
    return { paddingHorizontal: padH, gap }
  })

  const touchableAnimStyle = useAnimatedStyle(() => {
    const minHeight = compact
      ? interpolate(compact.value, [0, 1], [EXPANDED_SEGMENT_HEIGHT, COMPACT_SEGMENT_HEIGHT], 'clamp')
      : EXPANDED_SEGMENT_HEIGHT

    return { minHeight }
  })

  const labelAnimStyle = useAnimatedStyle(() => {
    if (labelMode === 'active-only' && activeAnim.value < 0.01) {
      return { opacity: 0, maxWidth: 0, overflow: 'hidden' as const }
    }
    const compactFactor = compact
      ? interpolate(compact.value, [0, 0.8], [1, 0], 'clamp')
      : 1
    const compactOpacity = compact
      ? interpolate(compact.value, [0, 0.6], [1, 0], 'clamp')
      : 1
    return {
      opacity: activeAnim.value * compactOpacity,
      maxWidth: interpolate(activeAnim.value, [0, 1], [0, 120], 'clamp') * compactFactor,
      overflow: 'hidden' as const,
    }
  }, [labelMode])

  return (
    <AnimatedTouchableOpacity
      activeOpacity={0.7}
      onPress={() => onChange(option.value)}
      onLayout={(e) => onLayout(e.nativeEvent.layout.x, e.nativeEvent.layout.width)}
      style={[styles.segmentTouchable, touchableAnimStyle]}
    >
      <ReanimatedLib.View style={[styles.segment, variant === 'segmented' && styles.segmentSquare, segmentAnimStyle]}>
        {Icon ? (
          <Icon
            color={selected ? textColor : secondaryColor}
            size={16}
            strokeWidth={2.25}
          />
        ) : null}
        <ReanimatedLib.View style={labelAnimStyle}>
          <Text
            style={[styles.segmentLabel, { color: selected ? textColor : secondaryColor }]}
            numberOfLines={1}
          >
            {option.label}
          </Text>
        </ReanimatedLib.View>
      </ReanimatedLib.View>
    </AnimatedTouchableOpacity>
  )
}

// ---------------------------------------------------------------------------
// Navigator
// ---------------------------------------------------------------------------

type Props<T extends string> = {
  value: T
  options: readonly CodeSubTabOption<T>[]
  onChange: (value: T) => void
  /** SharedValue 0..1 — 0 = expanded labels, 1 = icons only */
  compact?: SharedValue<number>
  /** 'all' — all tabs show label (default). 'active-only' — only the selected tab shows a label. */
  labelMode?: 'all' | 'active-only'
  /** Wrap the pill in a horizontal ScrollView when you have many tabs */
  scrollable?: boolean
  /** 'pill' — fully rounded (default). 'segmented' — square corners, active indicator overlaps container border. */
  variant?: 'pill' | 'segmented'
}

export default function CodeSubTabNavigator<T extends string>({
  value,
  options,
  onChange,
  compact,
  labelMode = 'all',
  scrollable = false,
  variant = 'pill',
}: Props<T>) {
  const { colors } = useTheme()

  const selectedIndex = options.findIndex((o) => o.value === value)
  const safeIndex = selectedIndex < 0 ? 0 : selectedIndex
  const optionCount = options.length

  const animatedIndex = useSharedValue(safeIndex)
  const containerWidth = useSharedValue(0)
  const segmentXs = useSharedValue<number[]>([])
  const segmentWidths = useSharedValue<number[]>([])

  useEffect(() => {
    animatedIndex.value = withSpring(safeIndex, {
      damping: 20,
      stiffness: 300,
      mass: 0.8,
    })
  }, [animatedIndex, safeIndex])

  const containerAnimStyle = useAnimatedStyle(() => {
    const paddingVertical = compact
      ? interpolate(compact.value, [0, 1], [spacing[1], spacing[0]], 'clamp')
      : spacing[1]

    return { paddingVertical }
  })

  const pillStyle = useAnimatedStyle(() => {
    const xs = segmentXs.value
    const ws = segmentWidths.value
    const segmentHeight = compact
      ? interpolate(compact.value, [0, 1], [EXPANDED_SEGMENT_HEIGHT, COMPACT_SEGMENT_HEIGHT], 'clamp')
      : EXPANDED_SEGMENT_HEIGHT
    const paddingVertical = compact
      ? interpolate(compact.value, [0, 1], [spacing[1], spacing[0]], 'clamp')
      : spacing[1]
    // For 'segmented', the indicator overlaps by 1px so it covers the
    // container border while still matching the current compact height.
    const overlapPx = variant === 'segmented' ? paddingVertical + 1 : 0

    const idxRange: number[] = []
    let hasMeasuredSegments = optionCount > 0
    for (let i = 0; i < optionCount; i++) {
      idxRange.push(i)
      if (!Number.isFinite(xs[i]) || !Number.isFinite(ws[i])) {
        hasMeasuredSegments = false
      }
    }

    const fallbackWidth = !scrollable && optionCount > 0
      ? (containerWidth.value - SEGMENT_GAP * (optionCount - 1)) / optionCount
      : 0

    if (!hasMeasuredSegments && fallbackWidth <= 0) return { opacity: 0 }

    const x = hasMeasuredSegments
      ? interpolate(animatedIndex.value, idxRange, xs as number[], 'clamp')
      : animatedIndex.value * (fallbackWidth + SEGMENT_GAP)
    const w = hasMeasuredSegments
      ? interpolate(animatedIndex.value, idxRange, ws as number[], 'clamp')
      : fallbackWidth

    return {
      opacity: 1,
      top: paddingVertical - overlapPx,
      height: segmentHeight + 2 * overlapPx,
      transform: [{ translateX: x }],
      width: w,
    }
  })

  const pill = (
    <ReanimatedLib.View
      style={[
        styles.container,
        variant === 'segmented' && styles.containerSegmented,
        containerAnimStyle,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.border,
        },
      ]}
      onLayout={(e) => {
        containerWidth.value = e.nativeEvent.layout.width
      }}
    >
      {/* Sliding active indicator — rendered first so segments sit on top */}
      <ReanimatedLib.View
        style={[
          styles.slidingPill,
          variant === 'segmented' && styles.slidingPillSegmented,
          { backgroundColor: colors.surface },
          pillStyle,
        ]}
      />

      {options.map((option, index) => (
        <Segment
          key={option.value}
          option={option}
          selected={option.value === value}
          compact={compact}
          labelMode={labelMode}
          variant={variant}
          onChange={onChange}
          textColor={colors.text}
          secondaryColor={colors.textSecondary}
          onLayout={(x, width) => {
            const newXs = [...segmentXs.value]
            const newWs = [...segmentWidths.value]
            newXs[index] = x
            newWs[index] = width
            segmentXs.value = newXs
            segmentWidths.value = newWs
          }}
        />
      ))}
    </ReanimatedLib.View>
  )

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {pill}
      </ScrollView>
    )
  }

  return pill
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    gap: SEGMENT_GAP,
    overflow: 'hidden',
  },
  slidingPill: {
    position: 'absolute',
    left: 0,
    borderRadius: borderRadius.full,
  },
  segmentTouchable: {
    flex: 1,
    minHeight: EXPANDED_SEGMENT_HEIGHT,
  },
  segment: {
    flex: 1,
    minHeight: EXPANDED_SEGMENT_HEIGHT,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  segmentLabel: {
    ...typeStyles.button,
  },
  containerSegmented: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: 0,
  },
  slidingPillSegmented: {
    borderRadius: borderRadius.lg,
  },
  segmentSquare: {
    borderRadius: borderRadius.md,
  },
  scrollView: {
    flexShrink: 1,
  },
  scrollContent: {
    flexGrow: 0,
  },
})
