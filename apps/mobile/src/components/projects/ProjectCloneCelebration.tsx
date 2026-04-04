import React, { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import { palette } from '@pocketdev/shared/theme'
import Animated, {
  Easing,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { Check } from 'lucide-react-native'

const BAUHAUS = palette.bauhaus
const CELEBRATION_LINES = Array.from({ length: 14 }, (_, index) => ({
  leftRatio: 0.04 + index * 0.068,
  height: 42 + (index % 5) * 18,
  width: index % 4 === 0 ? 4 : 3,
  delay: index * 36,
}))

type Props = {
  onComplete?: () => void
}

export default function ProjectCloneCelebration({ onComplete }: Props) {
  const progress = useSharedValue(0)
  const burstScale = useSharedValue(0.82)
  const burstOpacity = useSharedValue(0)
  const accentTranslateY = useSharedValue(18)

  useEffect(() => {
    progress.value = withTiming(1, { duration: 1280, easing: Easing.out(Easing.cubic) })
    burstOpacity.value = withSequence(
      withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }),
      withDelay(620, withTiming(0, { duration: 260, easing: Easing.in(Easing.quad) })),
    )
    burstScale.value = withSequence(
      withTiming(1.03, { duration: 260, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 220, easing: Easing.inOut(Easing.quad) }),
    )
    accentTranslateY.value = withSequence(
      withDelay(120, withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) })),
      withDelay(540, withTiming(-26, { duration: 320, easing: Easing.in(Easing.cubic) })),
    )

    const timer = setTimeout(() => {
      onComplete?.()
    }, 1500)

    return () => clearTimeout(timer)
  }, [accentTranslateY, burstOpacity, burstScale, onComplete, progress])

  const badgeStyle = useAnimatedStyle(() => ({
    opacity: burstOpacity.value,
    transform: [
      { scale: burstScale.value },
      { translateY: accentTranslateY.value },
    ],
  }))

  const washStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.18, 0.82, 1], [0, 0.18, 0.14, 0]),
  }))

  return (
    <View pointerEvents="none" style={styles.overlay}>
      <Animated.View style={[styles.colorWash, washStyle]} />
      <View style={styles.linesLayer}>
        {CELEBRATION_LINES.map((line, index) => (
          <CelebrationLine
            key={`${line.leftRatio}-${index}`}
            progress={progress}
            leftRatio={line.leftRatio}
            height={line.height}
            width={line.width}
            delay={line.delay}
          />
        ))}
      </View>
      <Animated.View style={[styles.centerBadge, badgeStyle]}>
        <View style={[styles.badgeCircle, { backgroundColor: BAUHAUS.yellow }]}>
          <Check color={BAUHAUS.black} size={20} strokeWidth={2.8} />
        </View>
        <View style={[styles.badgeBar, { backgroundColor: BAUHAUS.red }]} />
        <View style={[styles.badgeSquare, { backgroundColor: BAUHAUS.blue }]} />
      </Animated.View>
    </View>
  )
}

function CelebrationLine({
  progress,
  leftRatio,
  height,
  width,
  delay,
}: {
  progress: SharedValue<number>
  leftRatio: number
  height: number
  width: number
  delay: number
}) {
  const lineStyle = useAnimatedStyle(() => {
    const start = delay / 1280
    const local = Math.max(0, Math.min(1, (progress.value - start) / (1 - start || 1)))
    const opacity = interpolate(local, [0, 0.18, 0.9, 1], [0, 0.32, 0.88, 0])

    return {
      opacity,
      transform: [
        { translateY: interpolate(local, [0, 1], [-92, 210]) },
        { scaleY: interpolate(local, [0, 1], [0.7, 1.35]) },
      ],
    }
  })

  const colors = [BAUHAUS.blue, BAUHAUS.yellow, BAUHAUS.red]
  const color = colors[Math.round(leftRatio * 10) % colors.length]

  return (
    <Animated.View
      style={[
        styles.line,
        {
          left: `${leftRatio * 100}%`,
          height,
          width,
          backgroundColor: color,
        },
        lineStyle,
      ]}
    />
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  linesLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  line: {
    position: 'absolute',
    top: 0,
    borderRadius: 999,
  },
  centerBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeBar: {
    position: 'absolute',
    width: 88,
    height: 10,
    borderRadius: 999,
    transform: [{ rotate: '-18deg' }, { translateY: 24 }],
    opacity: 0.92,
  },
  badgeSquare: {
    position: 'absolute',
    width: 18,
    height: 18,
    top: -10,
    right: -6,
    transform: [{ rotate: '14deg' }],
  },
})
