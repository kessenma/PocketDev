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
  withTiming,
} from 'react-native-reanimated'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

const BAUHAUS = palette.bauhaus
const RUST_BG = palette.brand.rust

// Timing
const ROW_STAGGER = 120
const CELL_STAGGER = 60
const SLIDE_DURATION = 380
const COLOR_POP_DURATION = 200
const COLOR_POP_DELAY = 140
const HOLD_DURATION = 1100
const COMPRESS_DURATION = 600
const FINAL_FADE_DURATION = 220
const ICON_FADE_IN = 340

// Grid layout — 4 columns × 5 rows of parallelogram cells
const COLS = 4
const ROWS = 5
const CELL_W = SCREEN_WIDTH * 0.17
const CELL_H = CELL_W * 0.72
const SKEW_X = -12
const GAP_X = CELL_W * 0.18
const GAP_Y = CELL_H * 0.22

// Color square sits inset inside each parallelogram
const SQUARE_SIZE = CELL_W * 0.48

// Colors for the inset squares — weighted toward red/black for Rust
const CELL_COLORS = [
  BAUHAUS.red, BAUHAUS.yellow, BAUHAUS.blue,
  BAUHAUS.black, BAUHAUS.red, BAUHAUS.blue,
  BAUHAUS.yellow, BAUHAUS.red, BAUHAUS.black,
  BAUHAUS.red, BAUHAUS.blue, BAUHAUS.yellow,
  BAUHAUS.blue, BAUHAUS.red, BAUHAUS.red,
  BAUHAUS.black, BAUHAUS.yellow, BAUHAUS.red,
  BAUHAUS.red, BAUHAUS.blue,
]

// Total grid dimensions for centering
const GRID_W = COLS * CELL_W + (COLS - 1) * GAP_X
const GRID_H = ROWS * CELL_H + (ROWS - 1) * GAP_Y

type CellConfig = {
  id: string
  row: number
  col: number
  x: number
  y: number
  color: string
  slideFromX: number
}

const CELLS: CellConfig[] = []
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const x = c * (CELL_W + GAP_X) - GRID_W / 2 + CELL_W / 2
    const y = r * (CELL_H + GAP_Y) - GRID_H / 2 + CELL_H / 2
    // Alternate slide direction per row
    const slideFromX = r % 2 === 0 ? -SCREEN_WIDTH * 0.7 : SCREEN_WIDTH * 0.7
    CELLS.push({
      id: `cell-${r}-${c}`,
      row: r,
      col: c,
      x,
      y,
      color: CELL_COLORS[(r * COLS + c) % CELL_COLORS.length],
      slideFromX,
    })
  }
}

type Props = {
  onComplete: () => void
}

export default function RustSetupAnimation({ onComplete }: Props) {
  const { isDark } = useTheme()
  const overlayOpacity = useSharedValue(0)
  const { triggerExit } = useExitFade(overlayOpacity, onComplete)
  const iconOpacity = useSharedValue(0)
  const iconScale = useSharedValue(0.4)
  const compressProgress = useSharedValue(0)
  const fadeProgress = useSharedValue(0)

  useEffect(() => {
    overlayOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) })

    const lastRowDelay = (ROWS - 1) * ROW_STAGGER
    const lastCellDelay = (COLS - 1) * CELL_STAGGER
    const gridBuilt = lastRowDelay + lastCellDelay + SLIDE_DURATION + COLOR_POP_DELAY + COLOR_POP_DURATION + 200

    iconOpacity.value = withDelay(
      gridBuilt * 0.55,
      withTiming(1, { duration: ICON_FADE_IN, easing: Easing.out(Easing.cubic) }),
    )
    iconScale.value = withDelay(
      gridBuilt * 0.55,
      withTiming(1, { duration: ICON_FADE_IN, easing: Easing.out(Easing.quad) }),
    )

    compressProgress.value = withDelay(
      gridBuilt + HOLD_DURATION,
      withTiming(1, { duration: COMPRESS_DURATION, easing: Easing.inOut(Easing.quad) }),
    )

    fadeProgress.value = withDelay(
      gridBuilt + HOLD_DURATION + COMPRESS_DURATION,
      withTiming(1, { duration: FINAL_FADE_DURATION, easing: Easing.in(Easing.cubic) }),
    )

    const totalDuration = gridBuilt + HOLD_DURATION + COMPRESS_DURATION + FINAL_FADE_DURATION
    const timeout = setTimeout(() => {
      triggerExit()
    }, totalDuration + 40)

    return () => clearTimeout(timeout)
  }, [overlayOpacity, iconOpacity, iconScale, compressProgress, fadeProgress, triggerExit])

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }))

  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value * (1 - fadeProgress.value),
    transform: [
      { scale: interpolate(compressProgress.value, [0, 1], [iconScale.value, 1.06]) },
    ],
  }))

  const bgColor = isDark ? 'rgba(10, 10, 10, 0.96)' : RUST_BG

  return (
    <Animated.View style={[styles.overlay, { backgroundColor: bgColor }, overlayStyle]}>
      {CELLS.map((cell) => (
        <LatticeCell
          key={cell.id}
          config={cell}
          isDark={isDark}
          compressProgress={compressProgress}
          fadeProgress={fadeProgress}
        />
      ))}

      <Animated.View style={[styles.iconContainer, iconStyle]}>
        <Image source={Assets.rustWhite} style={styles.icon} resizeMode="contain" />
      </Animated.View>
    </Animated.View>
  )
}

function LatticeCell({
  config,
  isDark,
  compressProgress,
  fadeProgress,
}: {
  config: CellConfig
  isDark: boolean
  compressProgress: SharedValue<number>
  fadeProgress: SharedValue<number>
}) {
  const girderX = useSharedValue(config.slideFromX)
  const girderOpacity = useSharedValue(0)
  const squareScale = useSharedValue(0)
  const squareOpacity = useSharedValue(0)

  useEffect(() => {
    const delay = config.row * ROW_STAGGER + config.col * CELL_STAGGER

    girderOpacity.value = withDelay(
      delay,
      withTiming(isDark ? 0.7 : 0.85, { duration: SLIDE_DURATION * 0.3, easing: Easing.out(Easing.cubic) }),
    )
    girderX.value = withDelay(
      delay,
      withTiming(config.x, { duration: SLIDE_DURATION, easing: Easing.out(Easing.quad) }),
    )

    const popDelay = delay + SLIDE_DURATION - 80 + COLOR_POP_DELAY
    squareOpacity.value = withDelay(
      popDelay,
      withTiming(0.92, { duration: COLOR_POP_DURATION, easing: Easing.out(Easing.cubic) }),
    )
    squareScale.value = withDelay(
      popDelay,
      withTiming(1, { duration: COLOR_POP_DURATION, easing: Easing.out(Easing.quad) }),
    )
  }, [config, isDark, girderX, girderOpacity, squareScale, squareOpacity])

  const girderColor = isDark ? 'rgba(255,255,255,0.12)' : BAUHAUS.black

  const girderStyle = useAnimatedStyle(() => ({
    opacity: girderOpacity.value * (1 - fadeProgress.value),
    transform: [
      { translateX: interpolate(compressProgress.value, [0, 1], [girderX.value, 0]) },
      { translateY: interpolate(compressProgress.value, [0, 1], [config.y, 0]) },
      { skewX: `${SKEW_X}deg` },
      { scale: interpolate(compressProgress.value, [0, 1], [1, 0.15]) },
    ],
  }))

  const squareStyle = useAnimatedStyle(() => ({
    opacity: squareOpacity.value * (1 - fadeProgress.value),
    transform: [
      { translateX: interpolate(compressProgress.value, [0, 1], [girderX.value, 0]) },
      { translateY: interpolate(compressProgress.value, [0, 1], [config.y, 0]) },
      { skewX: `${SKEW_X}deg` },
      { scale: interpolate(compressProgress.value, [0, 1], [squareScale.value, 0.1]) },
    ],
  }))

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.girder,
          {
            width: CELL_W,
            height: CELL_H,
            backgroundColor: girderColor,
            marginLeft: -CELL_W / 2,
            marginTop: -CELL_H / 2,
          },
          girderStyle,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.square,
          {
            width: SQUARE_SIZE,
            height: SQUARE_SIZE,
            backgroundColor: config.color,
            marginLeft: -SQUARE_SIZE / 2,
            marginTop: -SQUARE_SIZE / 2,
          },
          squareStyle,
        ]}
      />
    </>
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
  girder: {
    position: 'absolute',
    left: '50%',
    top: '50%',
  },
  square: {
    position: 'absolute',
    left: '50%',
    top: '50%',
  },
})
