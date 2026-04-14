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
const RUST_BG = palette.brand.rust

// Timing
const ROW_STAGGER = 130
const CELL_STAGGER = 65
const SLIDE_DURATION = 400
const FACE_POP_DELAY = 120
const FACE_POP_DURATION = 220
const HOLD_DURATION = 1100
const COMPRESS_DURATION = 600
const FINAL_FADE_DURATION = 220
const ICON_FADE_IN = 340

// Grid — 3 columns × 4 rows of isometric blocks
const COLS = 3
const ROWS = 4

// Each block is an isometric cube: colored top face + black shadow faces
const FACE_SIZE = SCREEN_WIDTH * 0.18 // colored square face
const DEPTH = FACE_SIZE * 0.45 // depth of the 3D extrusion
const SKEW_ANGLE = 45 // degrees for the parallelogram shadow faces

const GAP_X = FACE_SIZE * 0.35
const GAP_Y = FACE_SIZE * 0.3

const GRID_W = COLS * (FACE_SIZE + DEPTH * 0.5) + (COLS - 1) * GAP_X
const GRID_H = ROWS * (FACE_SIZE + DEPTH * 0.5) + (ROWS - 1) * GAP_Y

// Colors for faces — red/black heavy for Rust, cycling through bauhaus
const FACE_COLORS = [
  BAUHAUS.blue, BAUHAUS.red, BAUHAUS.red,
  BAUHAUS.red, BAUHAUS.yellow, BAUHAUS.blue,
  BAUHAUS.yellow, BAUHAUS.red, BAUHAUS.red,
  BAUHAUS.red, BAUHAUS.blue, BAUHAUS.yellow,
]

type BlockConfig = {
  id: string
  row: number
  col: number
  x: number
  y: number
  color: string
  slideFromX: number
  slideFromY: number
}

const BLOCKS: BlockConfig[] = []
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const blockW = FACE_SIZE + DEPTH * 0.5
    const blockH = FACE_SIZE + DEPTH * 0.5
    const x = c * (blockW + GAP_X) - GRID_W / 2 + blockW / 2
    const y = r * (blockH + GAP_Y) - GRID_H / 2 + blockH / 2
    // Slide in from alternating diagonal directions
    const fromDir = (r + c) % 2 === 0 ? -1 : 1
    BLOCKS.push({
      id: `block-${r}-${c}`,
      row: r,
      col: c,
      x,
      y,
      color: FACE_COLORS[(r * COLS + c) % FACE_COLORS.length],
      slideFromX: fromDir * SCREEN_WIDTH * 0.6,
      slideFromY: -SCREEN_HEIGHT * 0.4,
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
    const gridBuilt = lastRowDelay + lastCellDelay + SLIDE_DURATION + FACE_POP_DELAY + FACE_POP_DURATION + 200

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
      {BLOCKS.map((block) => (
        <IsometricBlock
          key={block.id}
          config={block}
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

function IsometricBlock({
  config,
  isDark,
  compressProgress,
  fadeProgress,
}: {
  config: BlockConfig
  isDark: boolean
  compressProgress: SharedValue<number>
  fadeProgress: SharedValue<number>
}) {
  const blockX = useSharedValue(config.slideFromX)
  const blockY = useSharedValue(config.slideFromY)
  const blockOpacity = useSharedValue(0)
  const faceScale = useSharedValue(0)
  const faceOpacity = useSharedValue(0)

  useEffect(() => {
    const delay = config.row * ROW_STAGGER + config.col * CELL_STAGGER

    // Shadow block slides in with hard stop
    blockOpacity.value = withDelay(
      delay,
      withTiming(1, { duration: SLIDE_DURATION * 0.3, easing: Easing.out(Easing.cubic) }),
    )
    blockX.value = withDelay(
      delay,
      withTiming(config.x, { duration: SLIDE_DURATION, easing: Easing.out(Easing.quad) }),
    )
    blockY.value = withDelay(
      delay,
      withTiming(config.y, { duration: SLIDE_DURATION, easing: Easing.out(Easing.quad) }),
    )

    // Colored face pops in after block lands
    const popDelay = delay + SLIDE_DURATION - 60 + FACE_POP_DELAY
    faceOpacity.value = withDelay(
      popDelay,
      withTiming(1, { duration: FACE_POP_DURATION, easing: Easing.out(Easing.cubic) }),
    )
    faceScale.value = withDelay(
      popDelay,
      withTiming(1, { duration: FACE_POP_DURATION, easing: Easing.out(Easing.quad) }),
    )
  }, [config, isDark, blockX, blockY, blockOpacity, faceScale, faceOpacity])

  // Shadow color — creates depth
  const shadowColor = isDark ? 'rgba(255,255,255,0.1)' : BAUHAUS.black
  const shadowColorLight = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(26,26,26,0.7)'

  // The entire block (shadow + face) moves as one unit
  const containerStyle = useAnimatedStyle(() => ({
    opacity: blockOpacity.value * (1 - fadeProgress.value),
    transform: [
      { translateX: interpolate(compressProgress.value, [0, 1], [blockX.value, 0]) },
      { translateY: interpolate(compressProgress.value, [0, 1], [blockY.value, 0]) },
      { scale: interpolate(compressProgress.value, [0, 1], [1, 0.12]) },
    ],
  }))

  // Face pops in separately
  const faceStyle = useAnimatedStyle(() => ({
    opacity: faceOpacity.value,
    transform: [
      { scale: faceScale.value },
    ],
  }))

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.blockContainer,
        {
          width: FACE_SIZE + DEPTH * 0.7,
          height: FACE_SIZE + DEPTH * 0.7,
          marginLeft: -(FACE_SIZE + DEPTH * 0.7) / 2,
          marginTop: -(FACE_SIZE + DEPTH * 0.7) / 2,
        },
        containerStyle,
      ]}
    >
      {/* Bottom shadow face — parallelogram below the colored face */}
      <View style={{
        position: 'absolute',
        left: DEPTH * 0.35,
        top: FACE_SIZE,
        width: FACE_SIZE,
        height: DEPTH * 0.7,
        backgroundColor: shadowColor,
        transform: [{ skewX: `${-SKEW_ANGLE}deg` }],
      }} />

      {/* Right shadow face — parallelogram to the right of the colored face */}
      <View style={{
        position: 'absolute',
        left: FACE_SIZE,
        top: DEPTH * 0.35,
        width: DEPTH * 0.7,
        height: FACE_SIZE,
        backgroundColor: shadowColorLight,
        transform: [{ skewY: `${-SKEW_ANGLE}deg` }],
      }} />

      {/* Top colored face — the main visible square */}
      <Animated.View style={[{
        position: 'absolute',
        left: 0,
        top: 0,
        width: FACE_SIZE,
        height: FACE_SIZE,
        backgroundColor: config.color,
      }, faceStyle]} />
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
  iconContainer: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    zIndex: 10,
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
  blockContainer: {
    position: 'absolute',
    left: '50%',
    top: '50%',
  },
})
