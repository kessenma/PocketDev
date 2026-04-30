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
  type SharedValue,
} from 'react-native-reanimated'
import Svg, { Circle, G, Path, Rect } from 'react-native-svg'

const AnimatedRect = Animated.createAnimatedComponent(Rect)
const AnimatedPath = Animated.createAnimatedComponent(Path)
const AnimatedCircle = Animated.createAnimatedComponent(Circle)
const AnimatedG = Animated.createAnimatedComponent(G)

const BAUHAUS = palette.bauhaus

const W = 160
const H = 140

// Lock body — red, anchored slightly below center to leave room for the shackle
const BODY_W = 44
const BODY_H = 38
const BODY_CX = W / 2
const BODY_CY = H / 2 + 8
const BODY_X = BODY_CX - BODY_W / 2
const BODY_Y = BODY_CY - BODY_H / 2
const BODY_RX = 6

// Shackle — yellow arch atop the body
const SHACKLE_W = 24
const SHACKLE_BASE_Y = BODY_Y + 2

// Key proportions — bow on the right, shaft + bit pointing left into the keyhole
const KEY_BOW_R = 5
const KEY_SHAFT_LEN = 14
const KEY_BIT_W = 5
const KEY_BIT_H = 3.5

// Cycle timing — total ≈ 2.2s so the loop matches the wakeAndConnect window
const APPROACH_MS = 700
const TURN_MS = 320
const HOLD_MS = 800
const CYCLE_MS = APPROACH_MS + TURN_MS + HOLD_MS

export default function UnlockAnimation() {
  const bodyOpacity = useSharedValue(0.6)
  const shackleLift = useSharedValue(0)   // 0 = closed, 1 = popped open
  const keyApproach = useSharedValue(0)   // 0 = off-canvas, 1 = inserted
  const keyTurn = useSharedValue(0)       // 0..1 → 0..90deg around keyhole
  const pulse = useSharedValue(0)         // unlock burst

  useEffect(() => {
    bodyOpacity.value = withTiming(0.95, { duration: 280, easing: Easing.out(Easing.quad) })
  }, [bodyOpacity])

  useEffect(() => {
    function runOnce() {
      keyApproach.value = 0
      keyTurn.value = 0
      shackleLift.value = 0
      pulse.value = 0

      keyApproach.value = withTiming(1, { duration: APPROACH_MS, easing: Easing.out(Easing.cubic) })
      keyTurn.value = withDelay(
        APPROACH_MS,
        withTiming(1, { duration: TURN_MS, easing: Easing.inOut(Easing.quad) }),
      )
      shackleLift.value = withDelay(
        APPROACH_MS + TURN_MS - 80,
        withTiming(1, { duration: 240, easing: Easing.out(Easing.back(1.4)) }),
      )
      pulse.value = withDelay(
        APPROACH_MS + TURN_MS - 80,
        withSequence(
          withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 0 }),
        ),
      )
    }

    runOnce()
    const id = setInterval(runOnce, CYCLE_MS + 200)
    return () => clearInterval(id)
  }, [keyApproach, keyTurn, shackleLift, pulse])

  const bodyProps = useAnimatedProps(() => ({ opacity: bodyOpacity.value }))

  const shackleProps = useAnimatedProps(() => {
    const lift = shackleLift.value * 10
    const legH = 12 + lift
    const topY = BODY_Y - legH
    const leftX = BODY_CX - SHACKLE_W / 2
    const rightX = BODY_CX + SHACKLE_W / 2
    const arcR = SHACKLE_W / 2
    return {
      d: `M ${leftX} ${SHACKLE_BASE_Y} L ${leftX} ${topY + arcR} A ${arcR} ${arcR} 0 0 1 ${rightX} ${topY + arcR} L ${rightX} ${SHACKLE_BASE_Y}`,
    }
  })

  const pulseProps = useAnimatedProps(() => {
    const p = pulse.value
    return {
      r: 18 + p * 28,
      opacity: p > 0 ? Math.max(0, 0.55 * (1 - p)) : 0,
    }
  })

  return (
    <View>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Unlock pulse — emerges from keyhole, fades outward */}
        <AnimatedCircle
          cx={BODY_CX}
          cy={BODY_CY}
          fill={BAUHAUS.blue}
          animatedProps={pulseProps}
        />

        {/* Shackle — lifts when unlocked */}
        <AnimatedPath
          fill="none"
          stroke={BAUHAUS.yellow}
          strokeWidth={4.5}
          strokeLinecap="round"
          animatedProps={shackleProps}
        />

        {/* Lock body — red, mirrors the phone in DisconnectedAnimation */}
        <AnimatedRect
          x={BODY_X}
          y={BODY_Y}
          width={BODY_W}
          height={BODY_H}
          rx={BODY_RX}
          ry={BODY_RX}
          fill={BAUHAUS.red}
          animatedProps={bodyProps}
        />

        {/* Keyhole — receives the bit tip */}
        <Circle cx={BODY_CX} cy={BODY_CY} r={3.5} fill="rgba(0,0,0,0.35)" />

        <Key keyApproach={keyApproach} keyTurn={keyTurn} />
      </Svg>
    </View>
  )
}

function Key({
  keyApproach,
  keyTurn,
}: {
  keyApproach: SharedValue<number>
  keyTurn: SharedValue<number>
}) {
  // Key glyph in local coords with bow at origin, shaft + bit extending left.
  // Bit tip lands at (shaftEndX - bitW). The wrapper transform places the tip
  // at the keyhole when keyApproach reaches 1.
  const shaftEndX = -KEY_SHAFT_LEN
  const bitTipX = shaftEndX - KEY_BIT_W

  const groupProps = useAnimatedProps(() => {
    // Bit tip should land at keyhole when fully approached.
    const tipTargetX = BODY_CX
    const tipTargetY = BODY_CY
    // Translate so tip lands at target: bow origin lives at tipTargetX - bitTipX.
    const endX = tipTargetX - bitTipX
    const endY = tipTargetY
    const startX = W + 28
    const startY = H + 12
    const tx = startX + (endX - startX) * keyApproach.value
    const ty = startY + (endY - startY) * keyApproach.value

    // Rotate around the keyhole (in local coords that's bitTipX, 0)
    const rot = keyTurn.value * 90
    const opacity = keyApproach.value > 0.05 ? 1 : 0
    return {
      transform: `translate(${tx} ${ty}) rotate(${rot} ${bitTipX} 0)`,
      opacity,
    }
  })

  return (
    <AnimatedG animatedProps={groupProps}>
      {/* Bit + tooth (red) */}
      <Rect
        x={bitTipX}
        y={-KEY_BIT_H / 2}
        width={KEY_BIT_W}
        height={KEY_BIT_H}
        fill={BAUHAUS.red}
      />
      <Rect
        x={shaftEndX - KEY_BIT_W * 0.55}
        y={KEY_BIT_H / 2 - 0.2}
        width={KEY_BIT_W * 0.55}
        height={2.2}
        fill={BAUHAUS.red}
      />
      {/* Shaft (yellow) */}
      <Rect
        x={shaftEndX}
        y={-1.4}
        width={KEY_SHAFT_LEN}
        height={2.8}
        fill={BAUHAUS.yellow}
      />
      {/* Bow (blue) */}
      <Circle cx={0} cy={0} r={KEY_BOW_R} fill={BAUHAUS.blue} />
    </AnimatedG>
  )
}
