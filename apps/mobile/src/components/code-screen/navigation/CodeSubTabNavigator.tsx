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

const CIRCLE_SIZE = 42
const SEGMENT_H_PAD = spacing[2]

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
  }, [selected])

  const segmentAnimStyle = useAnimatedStyle(() => {
    const padH = compact
      ? interpolate(compact.value, [0, 1], [SEGMENT_H_PAD, 0], 'clamp')
      : SEGMENT_H_PAD
    const gap = compact
      ? interpolate(compact.value, [0, 0.8], [6, 0], 'clamp')
      : 6
    return { paddingHorizontal: padH, gap }
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
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onChange(option.value)}
      onLayout={(e) => onLayout(e.nativeEvent.layout.x, e.nativeEvent.layout.width)}
      style={styles.segmentTouchable}
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
    </TouchableOpacity>
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
  const segmentXs = useSharedValue<number[]>([])
  const segmentWidths = useSharedValue<number[]>([])

  useEffect(() => {
    animatedIndex.value = withSpring(safeIndex, {
      damping: 20,
      stiffness: 300,
      mass: 0.8,
    })
  }, [safeIndex])

  // For 'segmented': indicator extends 1px beyond the container's top/bottom padding
  // so the active tab's border replaces the container's border (fewer visual borders).
  const overlapPx = variant === 'segmented' ? spacing[1] + 1 : 0

  const pillStyle = useAnimatedStyle(() => {
    const xs = segmentXs.value
    const ws = segmentWidths.value
    if (xs.length < optionCount || ws.length < optionCount) return { opacity: 0 }

    const idxRange: number[] = []
    for (let i = 0; i < optionCount; i++) idxRange.push(i)

    const x = interpolate(animatedIndex.value, idxRange, xs as number[], 'clamp')
    const w = interpolate(animatedIndex.value, idxRange, ws as number[], 'clamp')

    return {
      opacity: 1,
      top: spacing[1] - overlapPx,
      height: CIRCLE_SIZE + 2 * overlapPx,
      transform: [{ translateX: x }],
      width: w,
    }
  })

  const pill = (
    <ReanimatedLib.View
      style={[
        styles.container,
        variant === 'segmented' && styles.containerSegmented,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Sliding active indicator — rendered first so segments sit on top */}
      <ReanimatedLib.View
        style={[
          styles.slidingPill,
          variant === 'segmented' && styles.slidingPillSegmented,
          { backgroundColor: colors.surface, borderColor: colors.border },
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
    gap: 2,
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[1],
  },
  slidingPill: {
    position: 'absolute',
    left: 0,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  segmentTouchable: {
    flex: 1,
    minHeight: CIRCLE_SIZE,
  },
  segment: {
    flex: 1,
    minHeight: CIRCLE_SIZE,
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
