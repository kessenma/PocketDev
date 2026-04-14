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

const TILE_STAGGER = 80
const LOGO_STAGGER = 190
const HOLD_DURATION = 1000
const COLLAPSE_DURATION = 520
const FINAL_FADE_DURATION = 220

const BOARD_WIDTH = SCREEN_WIDTH * 0.78
const BOARD_HEIGHT = SCREEN_HEIGHT * 0.34
const CELL_WIDTH = SCREEN_WIDTH * 0.13
const CELL_HEIGHT = SCREEN_WIDTH * 0.13
const CELL_GAP = SCREEN_WIDTH * 0.05
const CELL_Y = SCREEN_HEIGHT * 0.02

type BoardTileConfig = {
  id: string
  width: number
  height: number
  x: number
  y: number
  fromX: number
  fromY: number
  rotation: number
  color: string
  delay: number
  opacity: number
}

const BOARD_TILES: BoardTileConfig[] = [
  {
    id: 'top-bar',
    width: BOARD_WIDTH * 0.74,
    height: SCREEN_WIDTH * 0.038,
    x: 0,
    y: -BOARD_HEIGHT * 0.36,
    fromX: 0,
    fromY: -SCREEN_HEIGHT * 0.45,
    rotation: 0,
    color: BAUHAUS.yellow,
    delay: 0,
    opacity: 0.9,
  },
  {
    id: 'left-rail',
    width: SCREEN_WIDTH * 0.055,
    height: BOARD_HEIGHT * 0.82,
    x: -BOARD_WIDTH * 0.43,
    y: 0,
    fromX: -SCREEN_WIDTH * 0.65,
    fromY: 0,
    rotation: -2,
    color: BAUHAUS.blue,
    delay: 1,
    opacity: 0.84,
  },
  {
    id: 'right-rail',
    width: SCREEN_WIDTH * 0.055,
    height: BOARD_HEIGHT * 0.7,
    x: BOARD_WIDTH * 0.43,
    y: SCREEN_HEIGHT * 0.03,
    fromX: SCREEN_WIDTH * 0.65,
    fromY: SCREEN_HEIGHT * 0.06,
    rotation: 3,
    color: BAUHAUS.red,
    delay: 2,
    opacity: 0.82,
  },
  {
    id: 'mid-band',
    width: BOARD_WIDTH * 0.86,
    height: SCREEN_WIDTH * 0.03,
    x: 0,
    y: -SCREEN_HEIGHT * 0.02,
    fromX: -SCREEN_WIDTH * 0.52,
    fromY: -SCREEN_HEIGHT * 0.03,
    rotation: 0,
    color: BAUHAUS.black,
    delay: 3,
    opacity: 0.72,
  },
  {
    id: 'base-bar',
    width: BOARD_WIDTH * 0.68,
    height: SCREEN_WIDTH * 0.04,
    x: 0,
    y: BOARD_HEIGHT * 0.31,
    fromX: 0,
    fromY: SCREEN_HEIGHT * 0.48,
    rotation: 0,
    color: BAUHAUS.blue,
    delay: 4,
    opacity: 0.78,
  },
  {
    id: 'slot-1',
    width: CELL_WIDTH * 1.24,
    height: CELL_HEIGHT * 1.28,
    x: -((CELL_WIDTH + CELL_GAP) * 1.5),
    y: CELL_Y,
    fromX: -SCREEN_WIDTH * 0.38,
    fromY: -SCREEN_HEIGHT * 0.26,
    rotation: -8,
    color: BAUHAUS.yellow,
    delay: 5,
    opacity: 0.9,
  },
  {
    id: 'slot-2',
    width: CELL_WIDTH * 1.18,
    height: CELL_HEIGHT * 1.22,
    x: -((CELL_WIDTH + CELL_GAP) * 0.5),
    y: CELL_Y,
    fromX: -SCREEN_WIDTH * 0.18,
    fromY: SCREEN_HEIGHT * 0.32,
    rotation: 6,
    color: BAUHAUS.red,
    delay: 6,
    opacity: 0.86,
  },
  {
    id: 'slot-3',
    width: CELL_WIDTH * 1.18,
    height: CELL_HEIGHT * 1.22,
    x: (CELL_WIDTH + CELL_GAP) * 0.5,
    y: CELL_Y,
    fromX: SCREEN_WIDTH * 0.2,
    fromY: -SCREEN_HEIGHT * 0.28,
    rotation: -5,
    color: BAUHAUS.blue,
    delay: 7,
    opacity: 0.86,
  },
  {
    id: 'slot-4',
    width: CELL_WIDTH * 1.24,
    height: CELL_HEIGHT * 1.28,
    x: (CELL_WIDTH + CELL_GAP) * 1.5,
    y: CELL_Y,
    fromX: SCREEN_WIDTH * 0.4,
    fromY: SCREEN_HEIGHT * 0.3,
    rotation: 8,
    color: BAUHAUS.yellow,
    delay: 8,
    opacity: 0.9,
  },
  {
    id: 'micro-node-left',
    width: SCREEN_WIDTH * 0.06,
    height: SCREEN_WIDTH * 0.06,
    x: -BOARD_WIDTH * 0.24,
    y: -BOARD_HEIGHT * 0.2,
    fromX: -SCREEN_WIDTH * 0.7,
    fromY: -SCREEN_HEIGHT * 0.08,
    rotation: 0,
    color: BAUHAUS.red,
    delay: 9,
    opacity: 0.9,
  },
  {
    id: 'micro-node-right',
    width: SCREEN_WIDTH * 0.06,
    height: SCREEN_WIDTH * 0.06,
    x: BOARD_WIDTH * 0.24,
    y: BOARD_HEIGHT * 0.2,
    fromX: SCREEN_WIDTH * 0.7,
    fromY: SCREEN_HEIGHT * 0.1,
    rotation: 0,
    color: BAUHAUS.black,
    delay: 10,
    opacity: 0.76,
  },
]

const LOGO_SIZE = 40
const LOGOS = [
  { id: 'nvm', source: Assets.nvmWhite, delay: 0 },
  { id: 'npm', source: Assets.npmWhite, delay: 1 },
  { id: 'pnpm', source: Assets.pnpmWhite, delay: 2 },
  { id: 'bun', source: Assets.bunWhite, delay: 3 },
] as const

const LOGO_XS = [
  -((CELL_WIDTH + CELL_GAP) * 1.5),
  -((CELL_WIDTH + CELL_GAP) * 0.5),
  (CELL_WIDTH + CELL_GAP) * 0.5,
  (CELL_WIDTH + CELL_GAP) * 1.5,
]

type Props = {
  onComplete: () => void
}

export default function PackageInstallAnimation({ onComplete }: Props) {
  const { isDark } = useTheme()
  const overlayOpacity = useSharedValue(0)
  const { triggerExit } = useExitFade(overlayOpacity, onComplete)
  const collapseProgress = useSharedValue(0)
  const fadeProgress = useSharedValue(0)

  useEffect(() => {
    overlayOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) })

    const boardFinished = 180 + BOARD_TILES.length * TILE_STAGGER + 280
    const logosFinished = boardFinished + LOGOS.length * LOGO_STAGGER + 260

    collapseProgress.value = withDelay(
      logosFinished + HOLD_DURATION,
      withTiming(1, { duration: COLLAPSE_DURATION, easing: Easing.inOut(Easing.cubic) }),
    )
    fadeProgress.value = withDelay(
      logosFinished + HOLD_DURATION + COLLAPSE_DURATION,
      withTiming(1, { duration: FINAL_FADE_DURATION, easing: Easing.in(Easing.cubic) }),
    )

    const totalDuration = logosFinished + HOLD_DURATION + COLLAPSE_DURATION + FINAL_FADE_DURATION
    const timeout = setTimeout(() => {
      triggerExit()
    }, totalDuration + 40)

    return () => clearTimeout(timeout)
  }, [overlayOpacity, collapseProgress, fadeProgress, triggerExit])

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }))

  const bgColor = isDark ? 'rgba(10, 10, 10, 0.96)' : BAUHAUS.black

  const boardFinished = 180 + BOARD_TILES.length * TILE_STAGGER + 280

  return (
    <Animated.View style={[styles.overlay, { backgroundColor: bgColor }, overlayStyle]}>
      <BoardFrame
        isDark={isDark}
        collapseProgress={collapseProgress}
        fadeProgress={fadeProgress}
      />

      {BOARD_TILES.map((tile) => (
        <BoardTile
          key={tile.id}
          config={tile}
          collapseProgress={collapseProgress}
          fadeProgress={fadeProgress}
        />
      ))}

      {LOGOS.map((logo, index) => (
        <LogoCell
          key={logo.id}
          config={logo}
          x={LOGO_XS[index]!}
          boardFinished={boardFinished}
          collapseProgress={collapseProgress}
          fadeProgress={fadeProgress}
        />
      ))}
    </Animated.View>
  )
}

function BoardFrame({
  isDark,
  collapseProgress,
  fadeProgress,
}: {
  isDark: boolean
  collapseProgress: SharedValue<number>
  fadeProgress: SharedValue<number>
}) {
  const opacity = useSharedValue(0)
  const scale = useSharedValue(0.74)

  useEffect(() => {
    opacity.value = withDelay(
      80,
      withTiming(isDark ? 0.16 : 0.2, { duration: 260, easing: Easing.out(Easing.cubic) }),
    )
    scale.value = withDelay(
      80,
      withSpring(1, { damping: 14, stiffness: 95 }),
    )
  }, [isDark, opacity, scale])

  const borderColor = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.3)'

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * (1 - fadeProgress.value),
    transform: [
      {
        scaleX: interpolate(collapseProgress.value, [0, 1], [scale.value, 0.58]),
      },
      {
        scaleY: interpolate(collapseProgress.value, [0, 1], [scale.value, 0.34]),
      },
    ],
  }))

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.frame,
        {
          width: BOARD_WIDTH,
          height: BOARD_HEIGHT,
          marginLeft: -BOARD_WIDTH / 2,
          marginTop: -BOARD_HEIGHT / 2,
          borderColor,
        },
        animatedStyle,
      ]}
    />
  )
}

function BoardTile({
  config,
  collapseProgress,
  fadeProgress,
}: {
  config: BoardTileConfig
  collapseProgress: SharedValue<number>
  fadeProgress: SharedValue<number>
}) {
  const translateX = useSharedValue(config.fromX)
  const translateY = useSharedValue(config.fromY)
  const opacity = useSharedValue(0)
  const scale = useSharedValue(0.82)

  useEffect(() => {
    const delay = 140 + config.delay * TILE_STAGGER

    opacity.value = withDelay(
      delay,
      withTiming(config.opacity, { duration: 180, easing: Easing.out(Easing.cubic) }),
    )
    translateX.value = withDelay(
      delay,
      withSpring(config.x, { damping: 17, stiffness: 98 }),
    )
    translateY.value = withDelay(
      delay,
      withSpring(config.y, { damping: 17, stiffness: 98 }),
    )
    scale.value = withDelay(
      delay,
      withSpring(1, { damping: 15, stiffness: 110 }),
    )
  }, [config, opacity, scale, translateX, translateY])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * (1 - fadeProgress.value),
    borderRadius: interpolate(collapseProgress.value, [0, 1], [12, 18]),
    transform: [
      {
        translateX: interpolate(collapseProgress.value, [0, 1], [translateX.value, 0]),
      },
      {
        translateY: interpolate(collapseProgress.value, [0, 1], [translateY.value, 0]),
      },
      {
        scaleX: interpolate(collapseProgress.value, [0, 1], [scale.value, SCREEN_WIDTH * 0.42 / config.width]),
      },
      {
        scaleY: interpolate(collapseProgress.value, [0, 1], [scale.value, SCREEN_WIDTH * 0.14 / config.height]),
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
        styles.tile,
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

type LogoConfig = (typeof LOGOS)[number]

function LogoCell({
  config,
  x,
  boardFinished,
  collapseProgress,
  fadeProgress,
}: {
  config: LogoConfig
  x: number
  boardFinished: number
  collapseProgress: SharedValue<number>
  fadeProgress: SharedValue<number>
}) {
  const opacity = useSharedValue(0)
  const scale = useSharedValue(0.54)
  const cellOpacity = useSharedValue(0)

  useEffect(() => {
    const delay = boardFinished + config.delay * LOGO_STAGGER

    cellOpacity.value = withDelay(
      delay,
      withTiming(0.18, { duration: 220, easing: Easing.out(Easing.cubic) }),
    )
    opacity.value = withDelay(
      delay + 60,
      withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) }),
    )
    scale.value = withDelay(
      delay + 60,
      withSpring(1, { damping: 13, stiffness: 118 }),
    )
  }, [boardFinished, config.delay, cellOpacity, opacity, scale])

  const cellStyle = useAnimatedStyle(() => ({
    opacity: cellOpacity.value * (1 - fadeProgress.value),
    transform: [
      { translateX: interpolate(collapseProgress.value, [0, 1], [x, 0]) },
      { translateY: interpolate(collapseProgress.value, [0, 1], [CELL_Y, 0]) },
      { scale: interpolate(collapseProgress.value, [0, 1], [1, 0.22]) },
    ],
  }))

  const logoStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * (1 - fadeProgress.value),
    transform: [
      { translateX: interpolate(collapseProgress.value, [0, 1], [x, 0]) },
      { translateY: interpolate(collapseProgress.value, [0, 1], [CELL_Y, 0]) },
      { scale: interpolate(collapseProgress.value, [0, 1], [scale.value, 0.18]) },
    ],
  }))

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.logoCell,
          {
            width: CELL_WIDTH,
            height: CELL_HEIGHT,
            marginLeft: -CELL_WIDTH / 2,
            marginTop: -CELL_HEIGHT / 2,
          },
          cellStyle,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.logoContainer,
          {
            width: LOGO_SIZE,
            height: LOGO_SIZE,
            marginLeft: -LOGO_SIZE / 2,
            marginTop: -LOGO_SIZE / 2,
          },
          logoStyle,
        ]}
      >
        <Image source={config.source} style={styles.logoIcon} resizeMode="contain" />
      </Animated.View>
    </>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frame: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    borderWidth: 2,
    borderRadius: 28,
  },
  tile: {
    position: 'absolute',
    left: '50%',
    top: '50%',
  },
  logoCell: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  logoContainer: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    zIndex: 10,
  },
  logoIcon: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
})
