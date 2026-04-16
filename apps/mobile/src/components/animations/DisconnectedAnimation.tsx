import React, { useEffect } from 'react'
import { View } from 'react-native'
import { palette } from '@pocketdev/shared/theme'
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Line, Rect } from 'react-native-svg'

const AnimatedRect = Animated.createAnimatedComponent(Rect)
const AnimatedLine = Animated.createAnimatedComponent(Line)

const BAUHAUS = palette.bauhaus

const W = 160
const H = 140

// Phone centered in the canvas
const PHONE_W = 32
const PHONE_H = 56
const PHONE_RX = 7
const PHONE_CX = W / 2
const PHONE_CY = H / 2
const PHONE_X = PHONE_CX - PHONE_W / 2
const PHONE_Y = PHONE_CY - PHONE_H / 2

// Signal packets: start off-canvas, travel toward phone, dissolve before arrival
const SIGNAL_DURATION = 700
const LOOP_PAUSE = 650

type SignalConfig = { sx: number; sy: number; color: string; delay: number }

const SIGNALS: SignalConfig[] = [
  { sx: -6,        sy: PHONE_CY,    color: BAUHAUS.red,    delay: 0   },
  { sx: W * 0.22,  sy: -6,          color: BAUHAUS.yellow, delay: 180 },
  { sx: W * 0.78,  sy: -6,          color: BAUHAUS.blue,   delay: 90  },
  { sx: W + 6,     sy: PHONE_CY,    color: BAUHAUS.red,    delay: 260 },
  { sx: W / 2,     sy: H + 6,       color: BAUHAUS.blue,   delay: 130 },
]

export default function DisconnectedAnimation() {
  const phoneOpacity = useSharedValue(0.85)

  useEffect(() => {
    // Phone pulses dim ↔ bright to suggest a struggling/failed connection
    phoneOpacity.value = withRepeat(
      withSequence(
        withTiming(0.25, { duration: 600, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.85, { duration: 600, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.85, { duration: 350 }),
      ),
      -1,
    )
  }, [phoneOpacity])

  const phoneProps = useAnimatedProps(() => ({
    opacity: phoneOpacity.value,
  }))

  return (
    <View>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {SIGNALS.map((sig, i) => (
          <SignalPacket key={i} {...sig} />
        ))}

        {/* Phone body — red, pulsing */}
        <AnimatedRect
          x={PHONE_X}
          y={PHONE_Y}
          width={PHONE_W}
          height={PHONE_H}
          rx={PHONE_RX}
          ry={PHONE_RX}
          fill={BAUHAUS.red}
          animatedProps={phoneProps}
        />

        {/* X strike over the phone in yellow */}
        <Line
          x1={PHONE_X + 5}
          y1={PHONE_Y + 5}
          x2={PHONE_X + PHONE_W - 5}
          y2={PHONE_Y + PHONE_H - 5}
          stroke={BAUHAUS.yellow}
          strokeWidth={3.5}
          strokeLinecap="round"
        />
        <Line
          x1={PHONE_X + PHONE_W - 5}
          y1={PHONE_Y + 5}
          x2={PHONE_X + 5}
          y2={PHONE_Y + PHONE_H - 5}
          stroke={BAUHAUS.yellow}
          strokeWidth={3.5}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  )
}

function SignalPacket({ sx, sy, color, delay }: SignalConfig) {
  const progress = useSharedValue(0)

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: SIGNAL_DURATION, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 16 }),   // snap reset (one frame)
          withTiming(0, { duration: LOOP_PAUSE }),  // hold before next cycle
        ),
        -1,
      ),
    )
  }, [delay, progress])

  const animatedProps = useAnimatedProps(() => {
    const p = progress.value

    // Head leads the tail — both cap at 72% of the path so they never reach the phone
    const MAX_REACH = 0.72
    const headP = Math.min(p * 1.5, 1) * MAX_REACH
    const tailP = Math.max((p - 0.28) / 0.72, 0) * MAX_REACH

    // Fade in quickly, hold, then dissolve as signal fails to arrive
    const opacity =
      p < 0.18 ? p / 0.18
      : p < 0.62 ? 1
      : Math.max(0, 1 - (p - 0.62) / 0.38)

    return {
      x1: sx + (PHONE_CX - sx) * tailP,
      y1: sy + (PHONE_CY - sy) * tailP,
      x2: sx + (PHONE_CX - sx) * headP,
      y2: sy + (PHONE_CY - sy) * headP,
      opacity,
    }
  })

  return (
    <AnimatedLine
      animatedProps={animatedProps}
      stroke={color}
      strokeWidth={5}
      strokeLinecap="round"
    />
  )
}
