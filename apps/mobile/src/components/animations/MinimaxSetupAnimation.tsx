import React, { useEffect } from 'react'
import { Dimensions, Image, StyleSheet, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { useTheme } from '../../contexts/ThemeContext'
import { Assets } from '../../../assets'
import { useExitFade } from './useExitFade'
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

// Timing
const WAVE_COUNT = 13
const LINE_STAGGER = 60       // ms between each wave line entering
const LINE_ENTRY_DURATION = 400
const HOLD_DURATION = 1500
const COLLAPSE_DURATION = 500
const FINAL_FADE_DURATION = 200

// Wave geometry
const LINE_HEIGHT = 22        // px per wave lane
const AMPLITUDE = 12          // px of vertical oscillation
const FREQUENCY = 1.7         // wave cycles across screen width
const PHASE_STEP = 0.52       // radians phase shift per line (creates terrain undulation)
const STROKE_WIDTH = 1.8

const ALL_WAVES_IN = LINE_STAGGER * (WAVE_COUNT - 1) + LINE_ENTRY_DURATION + 80
const TOTAL_DURATION = ALL_WAVES_IN + HOLD_DURATION + COLLAPSE_DURATION + FINAL_FADE_DURATION

function makeWavePath(phase: number): string {
  const steps = 100
  const cy = LINE_HEIGHT / 2
  let d = ''
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * SCREEN_WIDTH
    const y = cy + AMPLITUDE * Math.sin(2 * Math.PI * FREQUENCY * (i / steps) + phase)
    d += i === 0 ? `M ${x.toFixed(1)},${y.toFixed(1)}` : ` L ${x.toFixed(1)},${y.toFixed(1)}`
  }
  return d
}

// Pre-compute paths at module level — never changes
const WAVE_PATHS = Array.from({ length: WAVE_COUNT }, (_, i) => makeWavePath(i * PHASE_STEP))

type Props = { onComplete: () => void; onBeforeFade?: () => void }

export default function MinimaxSetupAnimation({ onComplete, onBeforeFade }: Props) {
  const { isDark, colors } = useTheme()
  const overlayOpacity = useSharedValue(0)
  const { triggerExit } = useExitFade(overlayOpacity, onComplete, onBeforeFade)
  const iconOpacity = useSharedValue(0)
  const iconScale = useSharedValue(0.5)
  const collapseProgress = useSharedValue(0)

  useEffect(() => {
    overlayOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) })

    iconOpacity.value = withDelay(
      ALL_WAVES_IN * 0.45,
      withTiming(1, { duration: 340, easing: Easing.out(Easing.cubic) }),
    )
    iconScale.value = withDelay(
      ALL_WAVES_IN * 0.45,
      withSpring(1, { damping: 14, stiffness: 100 }),
    )

    collapseProgress.value = withDelay(
      ALL_WAVES_IN + HOLD_DURATION,
      withTiming(1, { duration: COLLAPSE_DURATION, easing: Easing.inOut(Easing.cubic) }),
    )

    const timeout = setTimeout(triggerExit, TOTAL_DURATION + 40)
    return () => clearTimeout(timeout)
  }, [overlayOpacity, iconOpacity, iconScale, collapseProgress, triggerExit])

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }))
  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value * (1 - collapseProgress.value),
    transform: [{ scale: 1 + collapseProgress.value * 0.04 }],
  }))

  const lineColor = isDark ? 'rgba(244,239,223,0.52)' : 'rgba(30,24,16,0.50)'

  return (
    <Animated.View style={[styles.overlay, { backgroundColor: colors.background }, overlayStyle]}>
      <View style={styles.waveBlock} pointerEvents="none">
        {WAVE_PATHS.map((path, i) => (
          <WaveLine
            key={i}
            index={i}
            path={path}
            lineColor={lineColor}
            collapseProgress={collapseProgress}
          />
        ))}
      </View>

      <View style={styles.gap} />

      <Animated.View style={[styles.iconContainer, iconStyle]}>
        <Image
          source={isDark ? Assets.minimaxWhite : Assets.minimaxBlack}
          style={styles.icon}
          resizeMode="contain"
        />
      </Animated.View>
    </Animated.View>
  )
}

function WaveLine({
  index,
  path,
  lineColor,
  collapseProgress,
}: {
  index: number
  path: string
  lineColor: string
  collapseProgress: SharedValue<number>
}) {
  const opacity = useSharedValue(0)
  const translateY = useSharedValue(-18)

  useEffect(() => {
    const delay = index * LINE_STAGGER
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: LINE_ENTRY_DURATION, easing: Easing.out(Easing.cubic) }),
    )
    translateY.value = withDelay(
      delay,
      withSpring(0, { damping: 22, stiffness: 140 }),
    )
  }, [index, opacity, translateY])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * (1 - collapseProgress.value),
    transform: [
      { translateY: translateY.value - collapseProgress.value * 24 },
    ],
  }))

  return (
    <Animated.View style={[{ height: LINE_HEIGHT }, animatedStyle]} pointerEvents="none">
      <Svg width={SCREEN_WIDTH} height={LINE_HEIGHT}>
        <Path d={path} stroke={lineColor} strokeWidth={STROKE_WIDTH} fill="none" strokeLinecap="round" />
      </Svg>
    </Animated.View>
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
  waveBlock: {
    width: SCREEN_WIDTH,
  },
  gap: {
    height: 48,
  },
  iconContainer: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
})
