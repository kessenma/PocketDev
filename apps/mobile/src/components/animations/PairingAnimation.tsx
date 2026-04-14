import React, { useEffect } from 'react'
import { Dimensions, StyleSheet } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { palette } from '@pocketdev/shared/theme'
import { useExitFade } from './useExitFade'
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

// Line configuration — 7 lines fanning from the top, converging on the phone
const LINE_COUNT = 7
const SPACING = 28
const LINE_ARRIVE_DURATION = 700
const LINE_STAGGER = 80

type Props = {
  onComplete: () => void
}

export default function PairingAnimation({ onComplete }: Props) {
  const { isDark } = useTheme()
  const overlayOpacity = useSharedValue(0)
  const { triggerExit } = useExitFade(overlayOpacity, onComplete)

  useEffect(() => {
    // Fade in the overlay
    overlayOpacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) })

    // Hold for a beat after phone turns blue, then exit
    const allLinesArrived = LINE_ARRIVE_DURATION + LINE_STAGGER * (LINE_COUNT - 1) + 100
    const totalDuration = allLinesArrived + 300 + 600
    const timeout = setTimeout(() => {
      triggerExit()
    }, totalDuration)

    return () => clearTimeout(timeout)
  }, [overlayOpacity, triggerExit])

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
        {/* Routing lines */}
        {Array.from({ length: LINE_COUNT }, (_, i) => (
          <RoutingLine key={i} index={i} />
        ))}

        {/* Phone shape — starts black, turns blue */}
        <PhoneShape />
      </Svg>
    </Animated.View>
  )
}

function RoutingLine({ index }: { index: number }) {
  const progress = useSharedValue(0)
  const centerIndex = (LINE_COUNT - 1) / 2
  const offset = (index - centerIndex) * SPACING

  // Start position: spread across the top
  const startX = SCREEN_WIDTH / 2 + offset * 3
  const startY = -20

  // End position: top edge of the phone
  const endX = PHONE_X + PHONE_W / 2 + offset * 0.3
  const endY = PHONE_Y

  useEffect(() => {
    progress.value = withDelay(
      index * LINE_STAGGER,
      withTiming(1, {
        duration: LINE_ARRIVE_DURATION,
        easing: Easing.out(Easing.cubic),
      }),
    )
  }, [index, progress])

  const animatedProps = useAnimatedProps(() => {
    const p = progress.value
    // Line grows from start toward end — the y2 (head) moves first, y1 (tail) follows
    const headP = Math.min(p * 1.6, 1)
    const tailP = Math.max((p - 0.3) / 0.7, 0)

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

function PhoneShape() {
  // Cross-fade two rects for smooth black → blue color transition
  const blackOpacity = useSharedValue(1)
  const blueOpacity = useSharedValue(0)

  useEffect(() => {
    // Sync with parent progress — when progress goes to 1, fade black out and blue in
    // We'll drive this from the same timing
    const allLinesArrived = LINE_ARRIVE_DURATION + LINE_STAGGER * (LINE_COUNT - 1) + 100

    blackOpacity.value = withDelay(
      allLinesArrived,
      withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) }),
    )
    blueOpacity.value = withDelay(
      allLinesArrived,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }),
    )
  }, [blackOpacity, blueOpacity])

  const blackProps = useAnimatedProps(() => ({
    opacity: blackOpacity.value,
  }))

  const blueProps = useAnimatedProps(() => ({
    opacity: blueOpacity.value,
  }))

  return (
    <>
      <AnimatedRect
        x={PHONE_X}
        y={PHONE_Y}
        width={PHONE_W}
        height={PHONE_H}
        rx={PHONE_RX}
        ry={PHONE_RX}
        fill={BAUHAUS.blue}
        animatedProps={blueProps}
      />
      <AnimatedRect
        x={PHONE_X}
        y={PHONE_Y}
        width={PHONE_W}
        height={PHONE_H}
        rx={PHONE_RX}
        ry={PHONE_RX}
        fill={BAUHAUS.black}
        animatedProps={blackProps}
      />
    </>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
