import React, { useEffect } from 'react'
import { Dimensions, Image, StyleSheet } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { Assets } from '../../../assets'
import { palette } from '@pocketdev/shared/theme'
import { useExitFade } from './useExitFade'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

const BAUHAUS = palette.bauhaus
const CPP_BG = palette.brand.cpp

// Timing
const ICON_FADE_IN = 300
const BAR_STAGGER = 80
const HOLD_DURATION = 800

// Cross-hatch grid — horizontal and vertical bars that intersect
type BarConfig = {
  id: string
  direction: 'horizontal' | 'vertical'
  color: string
  width: number
  height: number
  x: number
  y: number
  delay: number
}

function buildBars(): BarConfig[] {
  const bars: BarConfig[] = []
  const colors = [BAUHAUS.blue, BAUHAUS.red, BAUHAUS.yellow, BAUHAUS.black]
  let index = 0

  // Horizontal bars — spread vertically
  const hPositions = [-0.18, -0.09, 0.01, 0.09, 0.18]
  for (let i = 0; i < hPositions.length; i++) {
    const widthFrac = 0.5 + (i % 3) * 0.12
    bars.push({
      id: `h-${i}`,
      direction: 'horizontal',
      color: colors[i % colors.length]!,
      width: SCREEN_WIDTH * widthFrac,
      height: SCREEN_WIDTH * 0.025,
      x: ((i % 2 === 0 ? -1 : 1) * SCREEN_WIDTH * 0.06),
      y: SCREEN_HEIGHT * hPositions[i]!,
      delay: index++,
    })
  }

  // Vertical bars — spread horizontally
  const vPositions = [-0.16, -0.06, 0.04, 0.14]
  for (let i = 0; i < vPositions.length; i++) {
    const heightFrac = 0.35 + (i % 3) * 0.1
    bars.push({
      id: `v-${i}`,
      direction: 'vertical',
      color: colors[(i + 2) % colors.length]!,
      width: SCREEN_WIDTH * 0.025,
      height: SCREEN_HEIGHT * heightFrac,
      x: SCREEN_WIDTH * vPositions[i]!,
      y: ((i % 2 === 0 ? 1 : -1) * SCREEN_HEIGHT * 0.02),
      delay: index++,
    })
  }

  return bars
}

const BARS = buildBars()

type Props = {
  onComplete: () => void
}

export default function CppSetupAnimation({ onComplete }: Props) {
  const { isDark } = useTheme()
  const overlayOpacity = useSharedValue(0)
  const { triggerExit } = useExitFade(overlayOpacity, onComplete)
  const iconOpacity = useSharedValue(0)
  const iconScale = useSharedValue(0.5)

  useEffect(() => {
    overlayOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) })

    iconOpacity.value = withDelay(
      100,
      withTiming(1, { duration: ICON_FADE_IN, easing: Easing.out(Easing.cubic) }),
    )
    iconScale.value = withDelay(
      100,
      withSpring(1, { damping: 14, stiffness: 120 }),
    )

    const lastBarArrives = ICON_FADE_IN + BARS.length * BAR_STAGGER + 400
    const totalDuration = lastBarArrives + HOLD_DURATION
    const timeout = setTimeout(() => {
      triggerExit()
    }, totalDuration)

    return () => clearTimeout(timeout)
  }, [overlayOpacity, iconOpacity, iconScale, triggerExit])

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }))

  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value }],
  }))

  const bgColor = isDark ? 'rgba(10, 10, 10, 0.96)' : CPP_BG

  return (
    <Animated.View style={[styles.overlay, { backgroundColor: bgColor }, overlayStyle]}>
      {BARS.map((bar) => (
        <CrossBar key={bar.id} config={bar} />
      ))}

      <Animated.View style={[styles.iconContainer, iconStyle]}>
        <Image source={Assets.cppWhite} style={styles.icon} resizeMode="contain" />
      </Animated.View>
    </Animated.View>
  )
}

function CrossBar({ config }: { config: BarConfig }) {
  const translateMain = useSharedValue(
    config.direction === 'horizontal'
      ? -SCREEN_WIDTH
      : -SCREEN_HEIGHT,
  )
  const opacity = useSharedValue(0)

  useEffect(() => {
    const delay = ICON_FADE_IN + config.delay * BAR_STAGGER

    opacity.value = withDelay(
      delay,
      withTiming(0.55, { duration: 150, easing: Easing.out(Easing.cubic) }),
    )
    translateMain.value = withDelay(
      delay,
      withSpring(0, { damping: 16, stiffness: 90 }),
    )
  }, [config, translateMain, opacity])

  const animatedStyle = useAnimatedStyle(() => {
    if (config.direction === 'horizontal') {
      return {
        opacity: opacity.value,
        transform: [
          { translateX: config.x + translateMain.value },
          { translateY: config.y },
        ],
      }
    }
    return {
      opacity: opacity.value,
      transform: [
        { translateX: config.x },
        { translateY: config.y + translateMain.value },
      ],
    }
  })

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.bar,
        {
          width: config.width,
          height: config.height,
          backgroundColor: config.color,
          marginLeft: -config.width / 2,
          marginTop: -config.height / 2,
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
