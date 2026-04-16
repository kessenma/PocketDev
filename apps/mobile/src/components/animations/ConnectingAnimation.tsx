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
import Svg, { Rect } from 'react-native-svg'

const AnimatedRect = Animated.createAnimatedComponent(Rect)

// AnimatedLine needs to be created per-component since react-native-svg's
// Line is not exported as a named type — import the element and animate it.
import { Line } from 'react-native-svg'
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

// Signals: approach from all sides, arrive at the phone, then fade — looping
const SIGNAL_DURATION = 750
const LOOP_PAUSE = 600

type SignalConfig = { sx: number; sy: number; color: string; delay: number }

const SIGNALS: SignalConfig[] = [
  { sx: -6,        sy: PHONE_CY,    color: BAUHAUS.blue,   delay: 0   },
  { sx: W * 0.22,  sy: -6,          color: BAUHAUS.yellow, delay: 180 },
  { sx: W * 0.78,  sy: -6,          color: BAUHAUS.blue,   delay: 90  },
  { sx: W + 6,     sy: PHONE_CY,    color: BAUHAUS.yellow, delay: 260 },
  { sx: W / 2,     sy: H + 6,       color: BAUHAUS.blue,   delay: 130 },
]

export default function ConnectingAnimation() {
  const phoneOpacity = useSharedValue(0.6)

  useEffect(() => {
    // Gentle pulse — hopeful, waiting
    phoneOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.5, { duration: 700, easing: Easing.inOut(Easing.quad) }),
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

        {/* Phone body — blue, gently pulsing */}
        <AnimatedRect
          x={PHONE_X}
          y={PHONE_Y}
          width={PHONE_W}
          height={PHONE_H}
          rx={PHONE_RX}
          ry={PHONE_RX}
          fill={BAUHAUS.blue}
          animatedProps={phoneProps}
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
          withTiming(0, { duration: 16 }),        // snap reset
          withTiming(0, { duration: LOOP_PAUSE }), // hold before next cycle
        ),
        -1,
      ),
    )
  }, [delay, progress])

  const animatedProps = useAnimatedProps(() => {
    const p = progress.value

    // Head leads, tail follows — signals reach the phone (unlike the disconnected variant)
    const headP = Math.min(p * 1.4, 1)
    const tailP = Math.max((p - 0.3) / 0.7, 0)

    // Fade in → hold while traveling → fade out after arrival
    const opacity =
      p < 0.15 ? p / 0.15
      : p < 0.72 ? 1
      : Math.max(0, 1 - (p - 0.72) / 0.28)

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
