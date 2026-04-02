import React, { useEffect } from 'react'
import { Dimensions, StyleSheet } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { palette } from '@pocketdev/shared/theme'
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Line, Rect } from 'react-native-svg'

const AnimatedRect = Animated.createAnimatedComponent(Rect)
const AnimatedLine = Animated.createAnimatedComponent(Line)

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

const BAUHAUS = palette.bauhaus

// Phone dimensions (centered)
const PHONE_W = 60
const PHONE_H = 100
const PHONE_RX = 10
const PHONE_X = (SCREEN_WIDTH - PHONE_W) / 2
const PHONE_Y = (SCREEN_HEIGHT - PHONE_H) / 2

// Line configuration
const LINE_COUNT = 7
const SPACING = 28
const LINE_SHOOT_DURATION = 600
const LINE_STAGGER = 70

type Props = {
  onComplete: () => void
}

export default function ConnectedAnimation({ onComplete }: Props) {
  const { isDark } = useTheme()
  const overlayOpacity = useSharedValue(0)

  useEffect(() => {
    overlayOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) })

    // Phone appears blue immediately, lines shoot up, hold, then complete
    const allLinesSettled = LINE_SHOOT_DURATION + LINE_STAGGER * (LINE_COUNT - 1) + 100
    const holdDuration = 700
    const totalDuration = allLinesSettled + holdDuration
    const timeout = setTimeout(() => {
      onComplete()
    }, totalDuration)

    return () => clearTimeout(timeout)
  }, [overlayOpacity, onComplete])

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }))

  const bgColor = isDark ? 'rgba(10, 10, 10, 0.95)' : 'rgba(250, 250, 250, 0.95)'

  return (
    <Animated.View style={[styles.overlay, { backgroundColor: bgColor }, overlayStyle]}>
      <Svg
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        viewBox={`0 0 ${SCREEN_WIDTH} ${SCREEN_HEIGHT}`}
      >
        {/* Lines shoot upward from phone */}
        {Array.from({ length: LINE_COUNT }, (_, i) => (
          <ShootingLine key={i} index={i} />
        ))}

        {/* Phone — starts blue (already connected) */}
        <Rect
          x={PHONE_X}
          y={PHONE_Y}
          width={PHONE_W}
          height={PHONE_H}
          rx={PHONE_RX}
          ry={PHONE_RX}
          fill={BAUHAUS.blue}
        />

        {/* Signal dots that pulse at the line endpoints */}
        {Array.from({ length: LINE_COUNT }, (_, i) => (
          <SignalDot key={`dot-${i}`} index={i} />
        ))}
      </Svg>
    </Animated.View>
  )
}

function ShootingLine({ index }: { index: number }) {
  const progress = useSharedValue(0)
  const centerIndex = (LINE_COUNT - 1) / 2
  const offset = (index - centerIndex) * SPACING

  // Start: top edge of phone
  const startX = PHONE_X + PHONE_W / 2 + offset * 0.3
  const startY = PHONE_Y

  // End: fanned out at the top of the screen
  const endX = SCREEN_WIDTH / 2 + offset * 3
  const endY = -20

  useEffect(() => {
    progress.value = withDelay(
      index * LINE_STAGGER,
      withTiming(1, {
        duration: LINE_SHOOT_DURATION,
        easing: Easing.out(Easing.cubic),
      }),
    )
  }, [index, progress])

  const animatedProps = useAnimatedProps(() => {
    const p = progress.value
    // Head races ahead, tail follows — line stretches then settles into a full connection
    const headP = Math.min(p * 1.5, 1)
    const tailP = 0 // Tail stays at the phone

    return {
      x1: startX + (endX - startX) * tailP,
      y1: startY + (endY - startY) * tailP,
      x2: startX + (endX - startX) * headP,
      y2: startY + (endY - startY) * headP,
    }
  })

  return (
    <AnimatedLine
      animatedProps={animatedProps}
      stroke={BAUHAUS.black}
      strokeWidth={5}
      strokeLinecap="round"
    />
  )
}

function SignalDot({ index }: { index: number }) {
  const opacity = useSharedValue(0)
  const r = useSharedValue(0)
  const centerIndex = (LINE_COUNT - 1) / 2
  const offset = (index - centerIndex) * SPACING

  // Position at the far end of each line
  const cx = SCREEN_WIDTH / 2 + offset * 3
  const cy = -20

  useEffect(() => {
    // Appear after the line arrives
    const lineArrived = index * LINE_STAGGER + LINE_SHOOT_DURATION
    opacity.value = withDelay(
      lineArrived,
      withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) }),
    )
    r.value = withDelay(
      lineArrived,
      withTiming(6, { duration: 250, easing: Easing.out(Easing.cubic) }),
    )
  }, [index, opacity, r])

  // Use a small rect as a dot since AnimatedCircle needs createAnimatedComponent
  const animatedProps = useAnimatedProps(() => ({
    opacity: opacity.value,
    width: r.value * 2,
    height: r.value * 2,
    x: cx - r.value,
    y: cy - r.value,
  }))

  return (
    <AnimatedRect
      animatedProps={animatedProps}
      rx={6}
      ry={6}
      fill={BAUHAUS.blue}
    />
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
