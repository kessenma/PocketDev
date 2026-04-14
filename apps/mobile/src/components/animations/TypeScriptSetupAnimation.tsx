import React, { useEffect } from 'react'
import { Dimensions, Image, StyleSheet, View } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { Assets } from '../../../assets'
import { palette } from '@pocketdev/shared/theme'
import { useExitFade } from './useExitFade'
import Animated, {
  Easing,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

const BAUHAUS = palette.bauhaus
const TS_BG = palette.brand.typescript

// Timing
const PAIR_STAGGER = 180
const SLIDE_DURATION = 400
const PARAM_POP_DELAY = 160
const PARAM_POP_DURATION = 200
const ICON_FADE_IN = 340
const HOLD_DURATION = 1100
const TELESCOPE_DURATION = 580
const FINAL_FADE_DURATION = 220

// Each bracket pair = left L-shape + right L-shape (mirrored) + type param square
// Pairs nest concentrically — outermost is largest
type BracketPairConfig = {
  id: string
  // L-shape dimensions
  armLength: number   // length of each arm of the L
  armThick: number    // thickness of each arm
  color: string
  // Type parameter square
  paramSize: number
  paramColor: string
  delay: number
}

const BRACKET_PAIRS: BracketPairConfig[] = [
  {
    id: 'pair-0',
    armLength: SCREEN_WIDTH * 0.38,
    armThick: SCREEN_WIDTH * 0.09,
    color: BAUHAUS.blue,
    paramSize: SCREEN_WIDTH * 0.065,
    paramColor: BAUHAUS.yellow,
    delay: 0,
  },
  {
    id: 'pair-1',
    armLength: SCREEN_WIDTH * 0.28,
    armThick: SCREEN_WIDTH * 0.08,
    color: BAUHAUS.red,
    paramSize: SCREEN_WIDTH * 0.055,
    paramColor: BAUHAUS.blue,
    delay: 1,
  },
  {
    id: 'pair-2',
    armLength: SCREEN_WIDTH * 0.2,
    armThick: SCREEN_WIDTH * 0.07,
    color: BAUHAUS.blue,
    paramSize: SCREEN_WIDTH * 0.045,
    paramColor: BAUHAUS.red,
    delay: 2,
  },
  {
    id: 'pair-3',
    armLength: SCREEN_WIDTH * 0.13,
    armThick: SCREEN_WIDTH * 0.06,
    color: BAUHAUS.red,
    paramSize: SCREEN_WIDTH * 0.035,
    paramColor: BAUHAUS.yellow,
    delay: 3,
  },
]

// Scattered accent squares — small squares between bracket layers (like the poster)
type AccentConfig = {
  id: string
  size: number
  color: string
  x: number
  y: number
  fromX: number
  delay: number
}

const ACCENTS: AccentConfig[] = [
  {
    id: 'acc-0',
    size: SCREEN_WIDTH * 0.06,
    color: BAUHAUS.black,
    x: -SCREEN_WIDTH * 0.26,
    y: -SCREEN_HEIGHT * 0.08,
    fromX: -SCREEN_WIDTH * 0.6,
    delay: 0.5,
  },
  {
    id: 'acc-1',
    size: SCREEN_WIDTH * 0.05,
    color: BAUHAUS.yellow,
    x: SCREEN_WIDTH * 0.28,
    y: SCREEN_HEIGHT * 0.1,
    fromX: SCREEN_WIDTH * 0.6,
    delay: 1.5,
  },
  {
    id: 'acc-2',
    size: SCREEN_WIDTH * 0.045,
    color: BAUHAUS.black,
    x: SCREEN_WIDTH * 0.22,
    y: -SCREEN_HEIGHT * 0.14,
    fromX: SCREEN_WIDTH * 0.6,
    delay: 2.5,
  },
  {
    id: 'acc-3',
    size: SCREEN_WIDTH * 0.055,
    color: BAUHAUS.blue,
    x: -SCREEN_WIDTH * 0.24,
    y: SCREEN_HEIGHT * 0.12,
    fromX: -SCREEN_WIDTH * 0.6,
    delay: 3.2,
  },
]

type Props = {
  onComplete: () => void
}

export default function TypeScriptSetupAnimation({ onComplete }: Props) {
  const { isDark } = useTheme()
  const overlayOpacity = useSharedValue(0)
  const { triggerExit } = useExitFade(overlayOpacity, onComplete)
  const iconOpacity = useSharedValue(0)
  const iconScale = useSharedValue(0.4)
  const telescopeProgress = useSharedValue(0)
  const fadeProgress = useSharedValue(0)

  useEffect(() => {
    overlayOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) })

    const allPairsIn = BRACKET_PAIRS.length * PAIR_STAGGER + SLIDE_DURATION + PARAM_POP_DELAY + PARAM_POP_DURATION + 200

    iconOpacity.value = withDelay(
      allPairsIn * 0.55,
      withTiming(1, { duration: ICON_FADE_IN, easing: Easing.out(Easing.cubic) }),
    )
    iconScale.value = withDelay(
      allPairsIn * 0.55,
      withTiming(1, { duration: ICON_FADE_IN, easing: Easing.out(Easing.cubic) }),
    )

    telescopeProgress.value = withDelay(
      allPairsIn + HOLD_DURATION,
      withTiming(1, { duration: TELESCOPE_DURATION, easing: Easing.inOut(Easing.cubic) }),
    )

    fadeProgress.value = withDelay(
      allPairsIn + HOLD_DURATION + TELESCOPE_DURATION,
      withTiming(1, { duration: FINAL_FADE_DURATION, easing: Easing.in(Easing.cubic) }),
    )

    const totalDuration = allPairsIn + HOLD_DURATION + TELESCOPE_DURATION + FINAL_FADE_DURATION
    const timeout = setTimeout(() => {
      triggerExit()
    }, totalDuration + 40)

    return () => clearTimeout(timeout)
  }, [overlayOpacity, iconOpacity, iconScale, telescopeProgress, fadeProgress, triggerExit])

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }))

  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value * (1 - fadeProgress.value),
    transform: [
      { scale: interpolate(telescopeProgress.value, [0, 1], [iconScale.value, 1.06]) },
    ],
  }))

  const bgColor = isDark ? 'rgba(10, 10, 10, 0.96)' : TS_BG

  return (
    <Animated.View style={[styles.overlay, { backgroundColor: bgColor }, overlayStyle]}>
      {BRACKET_PAIRS.map((pair) => (
        <BracketPair
          key={pair.id}
          config={pair}
          isDark={isDark}
          telescopeProgress={telescopeProgress}
          fadeProgress={fadeProgress}
        />
      ))}

      {ACCENTS.map((accent) => (
        <AccentSquare
          key={accent.id}
          config={accent}
          isDark={isDark}
          telescopeProgress={telescopeProgress}
          fadeProgress={fadeProgress}
        />
      ))}

      <Animated.View style={[styles.iconContainer, iconStyle]}>
        <Image source={Assets.typescriptWhite} style={styles.icon} resizeMode="contain" />
      </Animated.View>
    </Animated.View>
  )
}

function BracketPair({
  config,
  isDark,
  telescopeProgress,
  fadeProgress,
}: {
  config: BracketPairConfig
  isDark: boolean
  telescopeProgress: SharedValue<number>
  fadeProgress: SharedValue<number>
}) {
  // Spacing from center — half the arm length + gap
  const offset = config.armLength * 0.5 + config.armThick * 0.3

  const leftX = useSharedValue(-SCREEN_WIDTH * 0.7)
  const rightX = useSharedValue(SCREEN_WIDTH * 0.7)
  const bracketOpacity = useSharedValue(0)
  const paramScale = useSharedValue(0)
  const paramOpacity = useSharedValue(0)

  useEffect(() => {
    const delay = config.delay * PAIR_STAGGER

    bracketOpacity.value = withDelay(
      delay,
      withTiming(isDark ? 0.7 : 0.88, { duration: SLIDE_DURATION * 0.35, easing: Easing.out(Easing.cubic) }),
    )
    leftX.value = withDelay(
      delay,
      withTiming(-offset, { duration: SLIDE_DURATION, easing: Easing.out(Easing.cubic) }),
    )
    rightX.value = withDelay(
      delay,
      withTiming(offset, { duration: SLIDE_DURATION, easing: Easing.out(Easing.cubic) }),
    )

    const popDelay = delay + SLIDE_DURATION - 60 + PARAM_POP_DELAY
    paramOpacity.value = withDelay(
      popDelay,
      withTiming(0.92, { duration: PARAM_POP_DURATION, easing: Easing.out(Easing.cubic) }),
    )
    paramScale.value = withDelay(
      popDelay,
      withTiming(1, { duration: PARAM_POP_DURATION, easing: Easing.out(Easing.quad) }),
    )
  }, [config, isDark, leftX, rightX, bracketOpacity, paramScale, paramOpacity])

  const bracketColor = isDark
    ? config.color === BAUHAUS.black ? 'rgba(255,255,255,0.2)' : config.color
    : config.color

  // Left L-bracket: ┘ rotated — vertical arm on left, horizontal arm on bottom
  const leftStyle = useAnimatedStyle(() => ({
    opacity: bracketOpacity.value * (1 - fadeProgress.value),
    transform: [
      { translateX: interpolate(telescopeProgress.value, [0, 1], [leftX.value, 0]) },
      { scale: interpolate(telescopeProgress.value, [0, 1], [1, 0.12]) },
    ],
  }))

  // Right L-bracket: ┌ mirrored — vertical arm on right, horizontal arm on top
  const rightStyle = useAnimatedStyle(() => ({
    opacity: bracketOpacity.value * (1 - fadeProgress.value),
    transform: [
      { translateX: interpolate(telescopeProgress.value, [0, 1], [rightX.value, 0]) },
      { scale: interpolate(telescopeProgress.value, [0, 1], [1, 0.12]) },
    ],
  }))

  // Type parameter square — sits at center between the pair
  const paramStyle = useAnimatedStyle(() => ({
    opacity: paramOpacity.value * (1 - fadeProgress.value),
    transform: [
      { scale: interpolate(telescopeProgress.value, [0, 1], [paramScale.value, 0.08]) },
    ],
  }))

  const armLen = config.armLength
  const armT = config.armThick

  return (
    <>
      {/* Left L-bracket */}
      <Animated.View pointerEvents="none" style={[styles.bracket, leftStyle]}>
        {/* Vertical arm */}
        <View style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: armT,
          height: armLen,
          backgroundColor: bracketColor,
        }} />
        {/* Horizontal arm */}
        <View style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: armLen,
          height: armT,
          backgroundColor: bracketColor,
        }} />
      </Animated.View>

      {/* Right L-bracket (mirrored) */}
      <Animated.View pointerEvents="none" style={[styles.bracket, rightStyle]}>
        {/* Vertical arm */}
        <View style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: armT,
          height: armLen,
          backgroundColor: bracketColor,
        }} />
        {/* Horizontal arm */}
        <View style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: armLen,
          height: armT,
          backgroundColor: bracketColor,
        }} />
      </Animated.View>

      {/* Type parameter square */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.param,
          {
            width: config.paramSize,
            height: config.paramSize,
            backgroundColor: config.paramColor,
            marginLeft: -config.paramSize / 2,
            marginTop: -config.paramSize / 2,
          },
          paramStyle,
        ]}
      />
    </>
  )
}

function AccentSquare({
  config,
  isDark,
  telescopeProgress,
  fadeProgress,
}: {
  config: AccentConfig
  isDark: boolean
  telescopeProgress: SharedValue<number>
  fadeProgress: SharedValue<number>
}) {
  const translateX = useSharedValue(config.fromX)
  const opacity = useSharedValue(0)

  useEffect(() => {
    const delay = config.delay * PAIR_STAGGER

    opacity.value = withDelay(
      delay,
      withTiming(isDark ? 0.5 : 0.7, { duration: SLIDE_DURATION * 0.4, easing: Easing.out(Easing.cubic) }),
    )
    translateX.value = withDelay(
      delay,
      withTiming(config.x, { duration: SLIDE_DURATION, easing: Easing.out(Easing.cubic) }),
    )
  }, [config, isDark, translateX, opacity])

  const accentColor = isDark
    ? config.color === BAUHAUS.black ? 'rgba(255,255,255,0.15)' : config.color
    : config.color

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * (1 - fadeProgress.value),
    transform: [
      { translateX: interpolate(telescopeProgress.value, [0, 1], [translateX.value, 0]) },
      { translateY: interpolate(telescopeProgress.value, [0, 1], [config.y, 0]) },
      { scale: interpolate(telescopeProgress.value, [0, 1], [1, 0.1]) },
    ],
  }))

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.accentSquare,
        {
          width: config.size,
          height: config.size,
          backgroundColor: accentColor,
          marginLeft: -config.size / 2,
          marginTop: -config.size / 2,
        },
        animatedStyle,
      ]}
    />
  )
}

const ICON_SIZE = 80

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    zIndex: 10,
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
  bracket: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 0,
    height: 0,
  },
  param: {
    position: 'absolute',
    left: '50%',
    top: '50%',
  },
  accentSquare: {
    position: 'absolute',
    left: '50%',
    top: '50%',
  },
})
