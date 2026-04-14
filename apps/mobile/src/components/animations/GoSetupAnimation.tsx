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
  withTiming,
} from 'react-native-reanimated'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

const BAUHAUS = palette.bauhaus
const GO_BG = palette.brand.go

// Timing
const BAR_STAGGER = 55
const SLIDE_DURATION = 420
const WAVE_CYCLE = 2800
const WAVE_AMPLITUDE = SCREEN_HEIGHT * 0.032
const ICON_FADE_IN = 340
const HOLD_DURATION = WAVE_CYCLE * 2.2
const CONVERGE_DURATION = 550
const FINAL_FADE_DURATION = 220

// Horizontal bars — goroutines
const BAR_COUNT = 14
const BAR_HEIGHT = SCREEN_HEIGHT * 0.014
const BAR_GAP = (SCREEN_HEIGHT * 0.52) / (BAR_COUNT - 1)

// Colors — weighted toward blue (Go brand), with bauhaus accents
const BAR_COLORS = [
  BAUHAUS.blue, BAUHAUS.black, BAUHAUS.blue, BAUHAUS.yellow,
  BAUHAUS.blue, BAUHAUS.red, BAUHAUS.black, BAUHAUS.blue,
  BAUHAUS.blue, BAUHAUS.yellow, BAUHAUS.blue, BAUHAUS.black,
  BAUHAUS.red, BAUHAUS.blue,
]

// Message dots that travel along bars
type MessageConfig = {
  id: string
  barIndex: number
  color: string
  size: number
  delay: number
  speed: number
}

const MESSAGES: MessageConfig[] = [
  { id: 'msg-0', barIndex: 2, color: BAUHAUS.yellow, size: SCREEN_WIDTH * 0.028, delay: 0, speed: 1800 },
  { id: 'msg-1', barIndex: 6, color: BAUHAUS.red, size: SCREEN_WIDTH * 0.022, delay: 400, speed: 2200 },
  { id: 'msg-2', barIndex: 10, color: BAUHAUS.yellow, size: SCREEN_WIDTH * 0.025, delay: 800, speed: 1600 },
  { id: 'msg-3', barIndex: 4, color: BAUHAUS.black, size: SCREEN_WIDTH * 0.02, delay: 1200, speed: 2000 },
]

type BarConfig = {
  index: number
  y: number
  width: number
  color: string
  fromX: number
}

const BARS: BarConfig[] = Array.from({ length: BAR_COUNT }, (_, i) => {
  const y = i * BAR_GAP - (BAR_COUNT - 1) * BAR_GAP / 2
  // Vary widths slightly — some goroutines do more work
  const widthFactor = 0.6 + Math.abs(Math.sin(i * 1.3)) * 0.35
  return {
    index: i,
    y,
    width: SCREEN_WIDTH * widthFactor,
    color: BAR_COLORS[i % BAR_COLORS.length],
    fromX: -SCREEN_WIDTH, // all slide from left
  }
})

type Props = {
  onComplete: () => void
}

export default function GoSetupAnimation({ onComplete }: Props) {
  const { isDark } = useTheme()
  const overlayOpacity = useSharedValue(0)
  const { triggerExit } = useExitFade(overlayOpacity, onComplete)
  const iconOpacity = useSharedValue(0)
  const iconScale = useSharedValue(0.4)
  const waveProgress = useSharedValue(0)
  const convergeProgress = useSharedValue(0)
  const fadeProgress = useSharedValue(0)

  useEffect(() => {
    overlayOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) })

    const allBarsIn = BAR_COUNT * BAR_STAGGER + SLIDE_DURATION + 100

    // Start wave once bars are in
    waveProgress.value = withDelay(
      allBarsIn,
      withRepeat(
        withTiming(1, { duration: WAVE_CYCLE, easing: Easing.linear }),
        -1,
        false,
      ),
    )

    // Icon fades in during the wave
    iconOpacity.value = withDelay(
      allBarsIn + WAVE_CYCLE * 0.4,
      withTiming(1, { duration: ICON_FADE_IN, easing: Easing.out(Easing.cubic) }),
    )
    iconScale.value = withDelay(
      allBarsIn + WAVE_CYCLE * 0.4,
      withTiming(1, { duration: ICON_FADE_IN, easing: Easing.out(Easing.cubic) }),
    )

    // Converge — all bars collapse to Y=0
    convergeProgress.value = withDelay(
      allBarsIn + HOLD_DURATION,
      withTiming(1, { duration: CONVERGE_DURATION, easing: Easing.inOut(Easing.cubic) }),
    )

    fadeProgress.value = withDelay(
      allBarsIn + HOLD_DURATION + CONVERGE_DURATION,
      withTiming(1, { duration: FINAL_FADE_DURATION, easing: Easing.in(Easing.cubic) }),
    )

    const totalDuration = allBarsIn + HOLD_DURATION + CONVERGE_DURATION + FINAL_FADE_DURATION
    const timeout = setTimeout(() => {
      triggerExit()
    }, totalDuration + 40)

    return () => clearTimeout(timeout)
  }, [overlayOpacity, iconOpacity, iconScale, waveProgress, convergeProgress, fadeProgress, triggerExit])

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }))

  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value * (1 - fadeProgress.value),
    transform: [
      { scale: interpolate(convergeProgress.value, [0, 1], [iconScale.value, 1.06]) },
    ],
  }))

  const bgColor = isDark ? 'rgba(10, 10, 10, 0.96)' : GO_BG

  return (
    <Animated.View style={[styles.overlay, { backgroundColor: bgColor }, overlayStyle]}>
      {BARS.map((bar) => (
        <GoroutineBar
          key={bar.index}
          config={bar}
          isDark={isDark}
          waveProgress={waveProgress}
          convergeProgress={convergeProgress}
          fadeProgress={fadeProgress}
        />
      ))}

      {MESSAGES.map((msg) => (
        <ChannelMessage
          key={msg.id}
          config={msg}
          bars={BARS}
          isDark={isDark}
          waveProgress={waveProgress}
          convergeProgress={convergeProgress}
          fadeProgress={fadeProgress}
        />
      ))}

      <Animated.View style={[styles.iconContainer, iconStyle]}>
        <Image source={Assets.goWhite} style={styles.icon} resizeMode="contain" />
      </Animated.View>
    </Animated.View>
  )
}

function GoroutineBar({
  config,
  isDark,
  waveProgress,
  convergeProgress,
  fadeProgress,
}: {
  config: BarConfig
  isDark: boolean
  waveProgress: SharedValue<number>
  convergeProgress: SharedValue<number>
  fadeProgress: SharedValue<number>
}) {
  const translateX = useSharedValue(config.fromX)
  const opacity = useSharedValue(0)

  useEffect(() => {
    const delay = config.index * BAR_STAGGER

    opacity.value = withDelay(
      delay,
      withTiming(isDark ? 0.6 : 0.8, { duration: SLIDE_DURATION * 0.4, easing: Easing.out(Easing.cubic) }),
    )
    translateX.value = withDelay(
      delay,
      withTiming(0, { duration: SLIDE_DURATION, easing: Easing.out(Easing.cubic) }),
    )
  }, [config, isDark, translateX, opacity])

  const phaseOffset = config.index * 0.45

  const animatedStyle = useAnimatedStyle(() => {
    const wave = Math.sin((waveProgress.value * Math.PI * 2) + phaseOffset) * WAVE_AMPLITUDE
    const waveY = wave * (1 - convergeProgress.value)
    const baseY = interpolate(convergeProgress.value, [0, 1], [config.y, 0])

    return {
      opacity: opacity.value * (1 - fadeProgress.value),
      transform: [
        { translateX: translateX.value },
        { translateY: baseY + waveY },
        { scaleX: interpolate(convergeProgress.value, [0, 1], [1, 0.12]) },
        { scaleY: interpolate(convergeProgress.value, [0, 1], [1, 0.5]) },
      ],
    }
  })

  const barColor = isDark
    ? config.color === BAUHAUS.black ? 'rgba(255,255,255,0.18)' : config.color
    : config.color

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.bar,
        {
          width: config.width,
          height: BAR_HEIGHT,
          backgroundColor: barColor,
          marginLeft: -config.width / 2,
          marginTop: -BAR_HEIGHT / 2,
          opacity: isDark && config.color !== BAUHAUS.black ? 0.5 : undefined,
          borderRadius: BAR_HEIGHT / 2,
        },
        animatedStyle,
      ]}
    />
  )
}

function ChannelMessage({
  config,
  bars,
  isDark,
  waveProgress,
  convergeProgress,
  fadeProgress,
}: {
  config: MessageConfig
  bars: BarConfig[]
  isDark: boolean
  waveProgress: SharedValue<number>
  convergeProgress: SharedValue<number>
  fadeProgress: SharedValue<number>
}) {
  const bar = bars[config.barIndex]
  const travelProgress = useSharedValue(0)
  const opacity = useSharedValue(0)

  useEffect(() => {
    const allBarsIn = BAR_COUNT * BAR_STAGGER + SLIDE_DURATION + 100
    const msgStart = allBarsIn + config.delay

    opacity.value = withDelay(
      msgStart,
      withSequence(
        withTiming(0.95, { duration: 200, easing: Easing.out(Easing.cubic) }),
      ),
    )

    // Travel left to right repeatedly
    travelProgress.value = withDelay(
      msgStart,
      withRepeat(
        withSequence(
          withTiming(0, { duration: 0 }),
          withTiming(1, { duration: config.speed, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      ),
    )
  }, [config, opacity, travelProgress])

  const phaseOffset = config.barIndex * 0.45

  const animatedStyle = useAnimatedStyle(() => {
    const travelX = interpolate(travelProgress.value, [0, 1], [-bar.width / 2, bar.width / 2])
    const wave = Math.sin((waveProgress.value * Math.PI * 2) + phaseOffset) * WAVE_AMPLITUDE
    const waveY = wave * (1 - convergeProgress.value)
    const baseY = interpolate(convergeProgress.value, [0, 1], [bar.y, 0])

    return {
      opacity: opacity.value * (1 - convergeProgress.value) * (1 - fadeProgress.value),
      transform: [
        { translateX: travelX },
        { translateY: baseY + waveY },
        { scale: interpolate(convergeProgress.value, [0, 1], [1, 0.1]) },
      ],
    }
  })

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.message,
        {
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          backgroundColor: config.color,
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
  bar: {
    position: 'absolute',
    left: '50%',
    top: '50%',
  },
  message: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    zIndex: 5,
  },
})
