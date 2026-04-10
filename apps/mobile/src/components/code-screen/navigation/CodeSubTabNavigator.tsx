import React from 'react'
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../../contexts/ThemeContext'
import type { CodeSubTabOption } from './types'

type Props<T extends string> = {
  value: T
  options: readonly CodeSubTabOption<T>[]
  onChange: (value: T) => void
  compact?: Animated.AnimatedInterpolation<number>
}

const CIRCLE_SIZE = 42
const SEGMENT_H_PAD = spacing[2]
const AnimatedApi = (Animated as any) ?? {}
const AnimatedView = AnimatedApi.View ?? View
const AnimatedText = AnimatedApi.Text ?? Text

export default function CodeSubTabNavigator<T extends string>({
  value,
  options,
  onChange,
  compact,
}: Props<T>) {
  const { colors } = useTheme()

  const labelOpacity = compact
    ? compact.interpolate({ inputRange: [0, 0.6], outputRange: [1, 0], extrapolate: 'clamp' })
    : 1

  const labelMaxWidth = compact
    ? compact.interpolate({ inputRange: [0, 0.8], outputRange: [120, 0], extrapolate: 'clamp' })
    : 120

  const segmentGap = compact
    ? compact.interpolate({ inputRange: [0, 0.8], outputRange: [6, 0], extrapolate: 'clamp' })
    : 6

  const segmentPadH = compact
    ? compact.interpolate({ inputRange: [0, 1], outputRange: [SEGMENT_H_PAD, 0], extrapolate: 'clamp' })
    : SEGMENT_H_PAD

  const containerPad = compact
    ? compact.interpolate({ inputRange: [0, 1], outputRange: [spacing[1], 3], extrapolate: 'clamp' })
    : spacing[1]

  return (
    <AnimatedView
      style={[
        styles.container,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.border,
          padding: containerPad,
        },
      ]}
    >
      {options.map((option) => {
        const selected = option.value === value
        const Icon = option.icon

        return (
          <AnimatedTouchable
            key={option.value}
            activeOpacity={0.7}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              {
                paddingHorizontal: segmentPadH,
                gap: segmentGap,
              },
              selected && {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            {Icon ? (
              <Icon
                color={selected ? colors.text : colors.textSecondary}
                size={16}
                strokeWidth={2.25}
              />
            ) : null}
            <AnimatedView style={{ opacity: labelOpacity, maxWidth: labelMaxWidth, overflow: 'hidden' }}>
              <AnimatedText
                style={[
                  styles.segmentLabel,
                  { color: selected ? colors.text : colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {option.label}
              </AnimatedText>
            </AnimatedView>
          </AnimatedTouchable>
        )
      })}
    </AnimatedView>
  )
}

const AnimatedTouchable = AnimatedApi.createAnimatedComponent
  ? AnimatedApi.createAnimatedComponent(TouchableOpacity)
  : TouchableOpacity

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    gap: 2,
    alignSelf: 'center',
    flexShrink: 1,
  },
  segment: {
    minHeight: CIRCLE_SIZE,
    minWidth: CIRCLE_SIZE,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentLabel: {
    ...typographyScale.sm,
    fontWeight: '600',
  },
})
