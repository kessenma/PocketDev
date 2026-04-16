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
  withTiming,
} from 'react-native-reanimated'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

const BAUHAUS = palette.bauhaus
const MINIMAX_BG = palette.brand.minimax

// Timing
const BAR_STAGGER = 72         // stagger delay per step outward from center
const GROW_DURATION = 460
const WAVE_CYCLE = 1300        // ms for one full traveling wave pass
const HOLD_DURATION = WAVE_CYCLE * 2.1
const ICON_FADE_IN = 320
const COLLAPSE_DURATION = 520
const FINAL_FADE_DURATION = 200

// 13 vertical bars that grow both up and down from the horizontal center line
const BAR_COUNT = 13
const CENTER_INDEX = Math.floor(BAR_COUNT / 2)  // = 6
const BAR_WIDTH = SCREEN_WIDTH * 0.036
const BAR_SPACING = SCREEN_WIDTH * 0.072
const BAR_MAX_HEIGHT = SCREEN_HEIGHT * 0.34
const BAR_MIN_HEIGHT = SCREEN_HEIGHT * 0.055
const WAVE_AMP = 0.30  // ±30% height variation during traveling wave

// Height profile approximating the logo's multi-peak waveform shape —
// symmetric, with 3 tall peaks (index 2, 6, 10) and shorter shoulders
const HEIGHT_PROFILE = [0.38, 0.70, 0.95, 0.70, 0.38, 0.62, 1.0, 0.62, 0.38, 0.70, 0.95, 0.70, 0.38]

// Colors — blue-dominant (Minimax's cool-toned brand) with Bauhaus accents
const BAR_COLORS = [
  BAUHAUS.black, BAUHAUS.blue,  BAUHAUS.black, BAUHAUS.red,
  BAUHAUS.blue,  BAUHAUS.yellow, BAUHAUS.blue, BAUHAUS.yellow,
  BAUHAUS.blue,  BAUHAUS.red,   BAUHAUS.black, BAUHAUS.blue, BAUHAUS.black,
]

type BarConfig = {
  index: number
  x: number
  naturalHeight: number
  color: string
  entryDelay: number
}

// Stagger entry from center outward so bars radiate from the icon position
const BARS: BarConfig[] = Array.from({ length: BAR_COUNT }, (_, i) => ({
  index: i,
  x: (i - CENTER_INDEX) * BAR_SPACING,
  naturalHeight: BAR_MIN_HEIGHT + HEIGHT_PROFILE[i] * (BAR_MAX_HEIGHT - BAR_MIN_HEIGHT),
  color: BAR_COLORS[i],
  entryDelay: Math.abs(i - CENTER_INDEX) * BAR_STAGGER,
}))

type Props = {
  onComplete: () => void
}

export default function MinimaxSetupAnimation({ onComplete }: Props) {
  const { isDark } = useTheme()
  const overlayOpacity = useSharedValue(0)
  const { triggerExit } = useExitFade(overlayOpacity, onComplete)
  const iconOpacity = useSharedValue(0)
  const iconScale = useSharedValue(0.4)
  const waveProgress = useSharedValue(0)
  const collapseProgress = useSharedValue(0)
  const fadeProgress = useSharedValue(0)

  useEffect(() => {
    overlayOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) })

    // Outermost bar arrives at: CENTER_INDEX * BAR_STAGGER + GROW_DURATION
    const allBarsIn = CENTER_INDEX * BAR_STAGGER + GROW_DURATION + 80

    // Traveling wave starts once bars are in place
    waveProgress.value = withDelay(
      allBarsIn,
      withRepeat(
        withTiming(1, { duration: WAVE_CYCLE, easing: Easing.linear }),
        -1,
        false,
      ),
    )

    // Icon fades in during the first wave pass
    iconOpacity.value = withDelay(
      allBarsIn + WAVE_CYCLE * 0.35,
      withTiming(1, { duration: ICON_FADE_IN, easing: Easing.out(Easing.cubic) }),
    )
    iconScale.value = withDelay(
      allBarsIn + WAVE_CYCLE * 0.35,
      withTiming(1, { duration: ICON_FADE_IN, easing: Easing.out(Easing.cubic) }),
    )

    collapseProgress.value = withDelay(
      allBarsIn + HOLD_DURATION,
      withTiming(1, { duration: COLLAPSE_DURATION, easing: Easing.inOut(Easing.cubic) }),
    )

    fadeProgress.value = withDelay(
      allBarsIn + HOLD_DURATION + COLLAPSE_DURATION,
      withTiming(1, { duration: FINAL_FADE_DURATION, easing: Easing.in(Easing.cubic) }),
    )

    const totalDuration = allBarsIn + HOLD_DURATION + COLLAPSE_DURATION + FINAL_FADE_DURATION
    const timeout = setTimeout(() => {
      triggerExit()
    }, totalDuration + 40)

    return () => clearTimeout(timeout)
  }, [overlayOpacity, iconOpacity, iconScale, waveProgress, collapseProgress, fadeProgress, triggerExit])

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }))

  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value * (1 - fadeProgress.value),
    transform: [
      { scale: interpolate(collapseProgress.value, [0, 1], [iconScale.value, 1.04]) },
    ],
  }))

  const bgColor = isDark ? 'rgba(10, 10, 10, 0.96)' : MINIMAX_BG

  return (
    <Animated.View style={[styles.overlay, { backgroundColor: bgColor }, overlayStyle]}>
      {BARS.map((bar) => (
        <WaveformBar
          key={bar.index}
          config={bar}
          isDark={isDark}
          waveProgress={waveProgress}
          collapseProgress={collapseProgress}
          fadeProgress={fadeProgress}
        />
      ))}

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

function WaveformBar({
  config,
  isDark,
  waveProgress,
  collapseProgress,
  fadeProgress,
}: {
  config: BarConfig
  isDark: boolean
  waveProgress: SharedValue<number>
  collapseProgress: SharedValue<number>
  fadeProgress: SharedValue<number>
}) {
  const entryScale = useSharedValue(0)
  const opacity = useSharedValue(0)

  useEffect(() => {
    opacity.value = withDelay(
      config.entryDelay,
      withTiming(isDark ? 0.75 : 0.88, { duration: GROW_DURATION * 0.4, easing: Easing.out(Easing.cubic) }),
    )
    entryScale.value = withDelay(
      config.entryDelay,
      withTiming(1, { duration: GROW_DURATION, easing: Easing.out(Easing.cubic) }),
    )
  }, [config, isDark, entryScale, opacity])

  // Phase offset creates leftward → rightward traveling wave
  // 2.5 wavelengths across the full bar span for visible wave motion
  const phaseOffset = (config.index / (BAR_COUNT - 1)) * Math.PI * 2.5

  const animatedStyle = useAnimatedStyle(() => {
    const wave = 1 + WAVE_AMP * Math.sin(waveProgress.value * Math.PI * 2 - phaseOffset)
    const scaleY = entryScale.value * wave * (1 - collapseProgress.value)

    // Converge X positions toward center as bars collapse inward
    const translateX = interpolate(collapseProgress.value, [0, 1], [config.x, 0])

    return {
      opacity: opacity.value * (1 - fadeProgress.value),
      transform: [
        { translateX },
        { scaleY },
      ],
    }
  })

  const barColor = isDark
    ? config.color === BAUHAUS.black ? 'rgba(255,255,255,0.22)' : config.color
    : config.color

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.bar,
        {
          width: BAR_WIDTH,
          height: config.naturalHeight,
          borderRadius: BAR_WIDTH / 2,
          backgroundColor: barColor,
          marginLeft: -BAR_WIDTH / 2,
          marginTop: -config.naturalHeight / 2,
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
  bar: {
    position: 'absolute',
    left: '50%',
    top: '50%',
  },
})
