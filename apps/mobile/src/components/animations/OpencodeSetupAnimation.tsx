import React, { useEffect } from 'react'
import { Dimensions, Image, StyleSheet } from 'react-native'
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
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const BAUHAUS = palette.bauhaus
const OPENCODE_BG = '#F0EAE0'

// Timing
const ICON_FADE_IN = 300
const BRACKET_ENTRY_DURATION = 540
const ACCENT_STAGGER = 180
const HOLD_DURATION = 1100
const COLLAPSE_DURATION = 460
const FINAL_FADE_DURATION = 200

// The square region the brackets frame — sized to comfortably wrap the icon
const FRAME_HALF = SCREEN_WIDTH * 0.24
const ARM_LENGTH = SCREEN_WIDTH * 0.088
const ARM_HALF = ARM_LENGTH / 2

// Each bracket is centered on screen; corner placed at ±FRAME_HALF by tx/ty
const BRACKETS = [
  { id: 'tl', border: 'tl' as const, color: BAUHAUS.blue,   tx: -FRAME_HALF + ARM_HALF, ty: -FRAME_HALF + ARM_HALF, delay: 0 },
  { id: 'tr', border: 'tr' as const, color: BAUHAUS.red,    tx:  FRAME_HALF - ARM_HALF, ty: -FRAME_HALF + ARM_HALF, delay: 1 },
  { id: 'bl', border: 'bl' as const, color: BAUHAUS.yellow, tx: -FRAME_HALF + ARM_HALF, ty:  FRAME_HALF - ARM_HALF, delay: 2 },
  { id: 'br', border: 'br' as const, color: BAUHAUS.black,  tx:  FRAME_HALF - ARM_HALF, ty:  FRAME_HALF - ARM_HALF, delay: 3 },
] as const

// Small accent shapes outside the bracket frame
const ACCENTS = [
  { id: 'acc-0', shape: 'circle' as const, color: BAUHAUS.red,    size: SCREEN_WIDTH * 0.05,  tx: -FRAME_HALF * 1.7, ty: -FRAME_HALF * 0.8, delay: 0 },
  { id: 'acc-1', shape: 'rect'   as const, color: BAUHAUS.blue,   w: SCREEN_WIDTH * 0.10, h: SCREEN_WIDTH * 0.03, tx:  FRAME_HALF * 1.4, ty: -FRAME_HALF * 1.1, delay: 1 },
  { id: 'acc-2', shape: 'rect'   as const, color: BAUHAUS.yellow, w: SCREEN_WIDTH * 0.06, h: SCREEN_WIDTH * 0.06, tx:  FRAME_HALF * 1.6, ty:  FRAME_HALF * 0.7, delay: 2 },
  { id: 'acc-3', shape: 'circle' as const, color: BAUHAUS.black,  size: SCREEN_WIDTH * 0.038, tx: -FRAME_HALF * 0.5, ty:  FRAME_HALF * 1.8, delay: 3 },
] as const

type Props = {
  onComplete: () => void
  onBeforeFade?: () => void
}

export default function OpencodeSetupAnimation({ onComplete, onBeforeFade }: Props) {
  const { isDark } = useTheme()
  const overlayOpacity = useSharedValue(0)
  const { triggerExit } = useExitFade(overlayOpacity, onComplete, onBeforeFade)
  const iconOpacity = useSharedValue(0)
  const iconScale = useSharedValue(0.5)
  const expandFactor = useSharedValue(0)
  const collapseProgress = useSharedValue(0)
  const breathe = useSharedValue(1)

  useEffect(() => {
    overlayOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) })

    iconOpacity.value = withDelay(
      80,
      withTiming(1, { duration: ICON_FADE_IN, easing: Easing.out(Easing.cubic) }),
    )
    iconScale.value = withDelay(
      80,
      withSpring(1, { damping: 12, stiffness: 100 }),
    )

    expandFactor.value = withDelay(
      ICON_FADE_IN,
      withTiming(1, { duration: BRACKET_ENTRY_DURATION, easing: Easing.out(Easing.cubic) }),
    )

    const holdStart = ICON_FADE_IN + BRACKET_ENTRY_DURATION

    // Gentle breathing pulse on the brackets during hold
    breathe.value = withDelay(
      holdStart + 100,
      withRepeat(
        withSequence(
          withTiming(1.07, { duration: 750, easing: Easing.inOut(Easing.cubic) }),
          withTiming(1.0,  { duration: 750, easing: Easing.inOut(Easing.cubic) }),
        ),
        -1,
        false,
      ),
    )

    collapseProgress.value = withDelay(
      holdStart + HOLD_DURATION,
      withTiming(1, { duration: COLLAPSE_DURATION, easing: Easing.inOut(Easing.cubic) }),
    )

    const totalDuration =
      holdStart + HOLD_DURATION + COLLAPSE_DURATION + FINAL_FADE_DURATION

    const timeout = setTimeout(() => {
      triggerExit()
    }, totalDuration + 40)

    return () => clearTimeout(timeout)
  }, [overlayOpacity, iconOpacity, iconScale, expandFactor, collapseProgress, breathe, triggerExit])

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }))

  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value }],
  }))

  const bgColor = isDark ? 'rgba(10, 10, 10, 0.96)' : OPENCODE_BG

  return (
    <Animated.View style={[styles.overlay, { backgroundColor: bgColor }, overlayStyle]}>
      {BRACKETS.map((b) => (
        <CornerBracket
          key={b.id}
          config={b}
          isDark={isDark}
          expandFactor={expandFactor}
          collapseProgress={collapseProgress}
          breathe={breathe}
        />
      ))}

      {ACCENTS.map((a) => (
        <FloatingAccent
          key={a.id}
          config={a}
          expandFactor={expandFactor}
          collapseProgress={collapseProgress}
        />
      ))}

      <Animated.View style={[styles.iconContainer, iconStyle]}>
        <Image
          source={isDark ? Assets.opencodeWhite : Assets.opencodeBlack}
          style={styles.icon}
          resizeMode="contain"
        />
      </Animated.View>
    </Animated.View>
  )
}

type BracketConfig = (typeof BRACKETS)[number]

function CornerBracket({
  config,
  isDark,
  expandFactor,
  collapseProgress,
  breathe,
}: {
  config: BracketConfig
  isDark: boolean
  expandFactor: SharedValue<number>
  collapseProgress: SharedValue<number>
  breathe: SharedValue<number>
}) {
  const opacity = useSharedValue(0)

  useEffect(() => {
    opacity.value = withDelay(
      ICON_FADE_IN + config.delay * 60,
      withTiming(0.9, { duration: 260, easing: Easing.out(Easing.cubic) }),
    )
  }, [config, opacity])

  const borderStyle = {
    tl: { borderTopWidth: 3, borderLeftWidth: 3 },
    tr: { borderTopWidth: 3, borderRightWidth: 3 },
    bl: { borderBottomWidth: 3, borderLeftWidth: 3 },
    br: { borderBottomWidth: 3, borderRightWidth: 3 },
  }[config.border]

  const animatedStyle = useAnimatedStyle(() => {
    const ef = expandFactor.value
    const cp = collapseProgress.value
    const expandedTx = config.tx * ef
    const expandedTy = config.ty * ef
    const pulse = interpolate(cp, [0, 1], [breathe.value, 1])
    return {
      opacity: opacity.value * (1 - cp),
      transform: [
        { translateX: interpolate(cp, [0, 1], [expandedTx, 0]) },
        { translateY: interpolate(cp, [0, 1], [expandedTy, 0]) },
        { scale: pulse },
      ],
    }
  })

  const borderColor =
    isDark && config.color === BAUHAUS.black ? 'rgba(255,255,255,0.75)' : config.color

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.bracket, borderStyle, { borderColor }, animatedStyle]}
    />
  )
}

type AccentConfig = (typeof ACCENTS)[number]

function FloatingAccent({
  config,
  expandFactor,
  collapseProgress,
}: {
  config: AccentConfig
  expandFactor: SharedValue<number>
  collapseProgress: SharedValue<number>
}) {
  const opacity = useSharedValue(0)

  useEffect(() => {
    opacity.value = withDelay(
      ICON_FADE_IN + BRACKET_ENTRY_DURATION * 0.6 + config.delay * ACCENT_STAGGER,
      withTiming(0.7, { duration: 300, easing: Easing.out(Easing.cubic) }),
    )
  }, [config, opacity])

  const isCircle = config.shape === 'circle'
  const w = isCircle ? config.size : config.w
  const h = isCircle ? config.size : config.h

  const animatedStyle = useAnimatedStyle(() => {
    const ef = expandFactor.value
    const cp = collapseProgress.value
    return {
      opacity: opacity.value * (1 - cp),
      transform: [
        { translateX: interpolate(cp, [0, 1], [config.tx * ef, 0]) },
        { translateY: interpolate(cp, [0, 1], [config.ty * ef, 0]) },
        { scale: interpolate(cp, [0, 1], [ef, 0.1]) },
      ],
    }
  })

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.accent,
        {
          width: w,
          height: h,
          borderRadius: isCircle ? w / 2 : 2,
          backgroundColor: config.color,
          marginLeft: -w / 2,
          marginTop: -h / 2,
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
    width: ARM_LENGTH,
    height: ARM_LENGTH,
    marginLeft: -ARM_HALF,
    marginTop: -ARM_HALF,
  },
  accent: {
    position: 'absolute',
    left: '50%',
    top: '50%',
  },
})
