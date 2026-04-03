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
  withSpring,
  withTiming,
} from 'react-native-reanimated'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

const BAUHAUS = palette.bauhaus
const PYTHON_BG = palette.brand.python

const ICON_FADE_IN = 360
const MODULE_STAGGER = 110
const FRAME_STAGGER = 180
const HOLD_DURATION = 1100
const COLLAPSE_DURATION = 580
const FINAL_FADE_DURATION = 220

type ModuleConfig = {
  id: string
  shape: 'circle' | 'rect'
  color: string
  width: number
  height: number
  x: number
  y: number
  fromX: number
  fromY: number
  rotation: number
  delay: number
  opacity: number
}

const MODULES: ModuleConfig[] = [
  {
    id: 'pkg-bar-top-left',
    shape: 'rect',
    color: BAUHAUS.yellow,
    width: SCREEN_WIDTH * 0.28,
    height: SCREEN_WIDTH * 0.05,
    x: -SCREEN_WIDTH * 0.23,
    y: -SCREEN_HEIGHT * 0.12,
    fromX: -SCREEN_WIDTH * 0.72,
    fromY: -SCREEN_HEIGHT * 0.18,
    rotation: -8,
    delay: 0,
    opacity: 0.86,
  },
  {
    id: 'pkg-node-top',
    shape: 'circle',
    color: BAUHAUS.blue,
    width: SCREEN_WIDTH * 0.09,
    height: SCREEN_WIDTH * 0.09,
    x: -SCREEN_WIDTH * 0.02,
    y: -SCREEN_HEIGHT * 0.2,
    fromX: 0,
    fromY: -SCREEN_HEIGHT * 0.48,
    rotation: 0,
    delay: 1,
    opacity: 0.9,
  },
  {
    id: 'pkg-bar-right',
    shape: 'rect',
    color: BAUHAUS.red,
    width: SCREEN_WIDTH * 0.08,
    height: SCREEN_WIDTH * 0.28,
    x: SCREEN_WIDTH * 0.24,
    y: -SCREEN_HEIGHT * 0.04,
    fromX: SCREEN_WIDTH * 0.68,
    fromY: -SCREEN_HEIGHT * 0.12,
    rotation: 6,
    delay: 2,
    opacity: 0.8,
  },
  {
    id: 'pkg-chip-bottom-right',
    shape: 'rect',
    color: BAUHAUS.black,
    width: SCREEN_WIDTH * 0.18,
    height: SCREEN_WIDTH * 0.08,
    x: SCREEN_WIDTH * 0.2,
    y: SCREEN_HEIGHT * 0.18,
    fromX: SCREEN_WIDTH * 0.56,
    fromY: SCREEN_HEIGHT * 0.34,
    rotation: -10,
    delay: 3,
    opacity: 0.72,
  },
  {
    id: 'pkg-node-bottom',
    shape: 'circle',
    color: BAUHAUS.yellow,
    width: SCREEN_WIDTH * 0.07,
    height: SCREEN_WIDTH * 0.07,
    x: -SCREEN_WIDTH * 0.08,
    y: SCREEN_HEIGHT * 0.22,
    fromX: -SCREEN_WIDTH * 0.12,
    fromY: SCREEN_HEIGHT * 0.52,
    rotation: 0,
    delay: 4,
    opacity: 0.88,
  },
  {
    id: 'pkg-ledger-left',
    shape: 'rect',
    color: BAUHAUS.blue,
    width: SCREEN_WIDTH * 0.09,
    height: SCREEN_WIDTH * 0.24,
    x: -SCREEN_WIDTH * 0.28,
    y: SCREEN_HEIGHT * 0.03,
    fromX: -SCREEN_WIDTH * 0.62,
    fromY: SCREEN_HEIGHT * 0.08,
    rotation: 4,
    delay: 5,
    opacity: 0.82,
  },
  {
    id: 'pkg-top-right',
    shape: 'rect',
    color: BAUHAUS.yellow,
    width: SCREEN_WIDTH * 0.16,
    height: SCREEN_WIDTH * 0.07,
    x: SCREEN_WIDTH * 0.18,
    y: -SCREEN_HEIGHT * 0.18,
    fromX: SCREEN_WIDTH * 0.54,
    fromY: -SCREEN_HEIGHT * 0.38,
    rotation: 14,
    delay: 6,
    opacity: 0.84,
  },
  {
    id: 'pkg-micro-node-right',
    shape: 'circle',
    color: BAUHAUS.red,
    width: SCREEN_WIDTH * 0.05,
    height: SCREEN_WIDTH * 0.05,
    x: SCREEN_WIDTH * 0.31,
    y: SCREEN_HEIGHT * 0.05,
    fromX: SCREEN_WIDTH * 0.72,
    fromY: SCREEN_HEIGHT * 0.08,
    rotation: 0,
    delay: 7,
    opacity: 0.88,
  },
  {
    id: 'pkg-base-band',
    shape: 'rect',
    color: BAUHAUS.black,
    width: SCREEN_WIDTH * 0.3,
    height: SCREEN_WIDTH * 0.045,
    x: 0,
    y: SCREEN_HEIGHT * 0.28,
    fromX: 0,
    fromY: SCREEN_HEIGHT * 0.58,
    rotation: 0,
    delay: 8,
    opacity: 0.6,
  },
  {
    id: 'pkg-accent-left',
    shape: 'rect',
    color: BAUHAUS.red,
    width: SCREEN_WIDTH * 0.13,
    height: SCREEN_WIDTH * 0.06,
    x: -SCREEN_WIDTH * 0.17,
    y: -SCREEN_HEIGHT * 0.01,
    fromX: -SCREEN_WIDTH * 0.46,
    fromY: -SCREEN_HEIGHT * 0.03,
    rotation: -18,
    delay: 9,
    opacity: 0.74,
  },
]

type FrameConfig = {
  id: string
  width: number
  height: number
  rotation: number
  delay: number
}

const FRAMES: FrameConfig[] = [
  {
    id: 'frame-outer',
    width: SCREEN_WIDTH * 0.78,
    height: SCREEN_WIDTH * 0.54,
    rotation: -6,
    delay: 0,
  },
  {
    id: 'frame-inner',
    width: SCREEN_WIDTH * 0.54,
    height: SCREEN_WIDTH * 0.36,
    rotation: 4,
    delay: 1,
  },
]

type Props = {
  onComplete: () => void
}

export default function PythonSetupAnimation({ onComplete }: Props) {
  const { isDark } = useTheme()
  const overlayOpacity = useSharedValue(0)
  const { triggerExit } = useExitFade(overlayOpacity, onComplete)
  const iconOpacity = useSharedValue(0)
  const iconScale = useSharedValue(0.45)
  const collapseProgress = useSharedValue(0)
  const fadeProgress = useSharedValue(0)

  useEffect(() => {
    overlayOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) })

    const ecosystemBuilt = MODULES.length * MODULE_STAGGER + 520
    iconOpacity.value = withDelay(
      ecosystemBuilt * 0.45,
      withTiming(1, { duration: ICON_FADE_IN, easing: Easing.out(Easing.cubic) }),
    )
    iconScale.value = withDelay(
      ecosystemBuilt * 0.45,
      withSpring(1, { damping: 12, stiffness: 110 }),
    )

    collapseProgress.value = withDelay(
      ecosystemBuilt + HOLD_DURATION,
      withTiming(1, { duration: COLLAPSE_DURATION, easing: Easing.inOut(Easing.cubic) }),
    )
    fadeProgress.value = withDelay(
      ecosystemBuilt + HOLD_DURATION + COLLAPSE_DURATION,
      withTiming(1, { duration: FINAL_FADE_DURATION, easing: Easing.in(Easing.cubic) }),
    )

    const totalDuration = ecosystemBuilt + HOLD_DURATION + COLLAPSE_DURATION + FINAL_FADE_DURATION
    const timeout = setTimeout(() => {
      triggerExit()
    }, totalDuration + 40)

    return () => clearTimeout(timeout)
  }, [overlayOpacity, iconOpacity, iconScale, collapseProgress, fadeProgress, triggerExit])

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }))

  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value * (1 - fadeProgress.value),
    transform: [
      {
        scale: interpolate(collapseProgress.value, [0, 1], [iconScale.value, 1.04]),
      },
    ],
  }))

  const bgColor = isDark ? 'rgba(10, 10, 10, 0.96)' : PYTHON_BG

  return (
    <Animated.View style={[styles.overlay, { backgroundColor: bgColor }, overlayStyle]}>
      {FRAMES.map((frame) => (
        <CoreFrame
          key={frame.id}
          config={frame}
          isDark={isDark}
          collapseProgress={collapseProgress}
          fadeProgress={fadeProgress}
        />
      ))}

      {MODULES.map((module) => (
        <DependencyModule
          key={module.id}
          config={module}
          collapseProgress={collapseProgress}
          fadeProgress={fadeProgress}
        />
      ))}

      <Animated.View style={[styles.iconContainer, iconStyle]}>
        <Image source={Assets.pythonWhite} style={styles.icon} resizeMode="contain" />
      </Animated.View>
    </Animated.View>
  )
}

function CoreFrame({
  config,
  isDark,
  collapseProgress,
  fadeProgress,
}: {
  config: FrameConfig
  isDark: boolean
  collapseProgress: SharedValue<number>
  fadeProgress: SharedValue<number>
}) {
  const scale = useSharedValue(0.4)
  const opacity = useSharedValue(0)

  useEffect(() => {
    const delay = 120 + config.delay * FRAME_STAGGER

    opacity.value = withDelay(
      delay,
      withTiming(isDark ? 0.18 : 0.22, { duration: 260, easing: Easing.out(Easing.cubic) }),
    )
    scale.value = withDelay(
      delay,
      withSpring(1, { damping: 14, stiffness: 95 }),
    )
  }, [config.delay, isDark, opacity, scale])

  const borderColor = isDark ? 'rgba(255,255,255,0.26)' : 'rgba(17,17,17,0.18)'

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * (1 - fadeProgress.value),
    transform: [
      {
        scale: interpolate(collapseProgress.value, [0, 1], [scale.value, 0.18]),
      },
      { rotate: `${config.rotation}deg` },
    ],
  }))

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.frame,
        {
          width: config.width,
          height: config.height,
          marginLeft: -config.width / 2,
          marginTop: -config.height / 2,
          borderColor,
        },
        animatedStyle,
      ]}
    />
  )
}

function DependencyModule({
  config,
  collapseProgress,
  fadeProgress,
}: {
  config: ModuleConfig
  collapseProgress: SharedValue<number>
  fadeProgress: SharedValue<number>
}) {
  const translateX = useSharedValue(config.fromX)
  const translateY = useSharedValue(config.fromY)
  const opacity = useSharedValue(0)
  const scale = useSharedValue(0.72)

  useEffect(() => {
    const delay = 120 + config.delay * MODULE_STAGGER

    opacity.value = withDelay(
      delay,
      withTiming(config.opacity, { duration: 220, easing: Easing.out(Easing.cubic) }),
    )
    translateX.value = withDelay(
      delay,
      withSpring(config.x, { damping: 16, stiffness: 96 }),
    )
    translateY.value = withDelay(
      delay,
      withSpring(config.y, { damping: 16, stiffness: 96 }),
    )
    scale.value = withDelay(
      delay,
      withSpring(1, { damping: 15, stiffness: 110 }),
    )
  }, [config, translateX, translateY, opacity, scale])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * (1 - fadeProgress.value),
    transform: [
      {
        translateX: interpolate(collapseProgress.value, [0, 1], [translateX.value, 0]),
      },
      {
        translateY: interpolate(collapseProgress.value, [0, 1], [translateY.value, 0]),
      },
      {
        scale: interpolate(collapseProgress.value, [0, 1], [scale.value, 0.18]),
      },
      {
        rotate: `${interpolate(collapseProgress.value, [0, 1], [config.rotation, 0])}deg`,
      },
    ],
  }))

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.module,
        config.shape === 'circle' ? styles.moduleCircle : styles.moduleRect,
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
    ...StyleSheet.absoluteFillObject,
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
  frame: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    borderWidth: 2,
    borderRadius: 28,
  },
  module: {
    position: 'absolute',
    left: '50%',
    top: '50%',
  },
  moduleCircle: {
    borderRadius: 999,
  },
  moduleRect: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
})
