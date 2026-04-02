import React, { useEffect } from 'react'
import { Dimensions, Image, StyleSheet, View } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { Assets } from '../../../assets'
import { palette } from '@pocketdev/shared/theme'
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

// Timing
const TILE_STAGGER = 50
const TILE_FALL_DURATION = 400
const LOGO_STAGGER = 250
const LOGO_FADE_IN = 300
const HOLD_DURATION = 800

// Mosaic grid — small tiles that cascade down in columns
// 5 columns, 4 rows above center + 4 rows below = visual grid around the logos
const COLS = 5
const ROWS_ABOVE = 4
const ROWS_BELOW = 4
const TILE_SIZE = SCREEN_WIDTH * 0.1
const TILE_GAP = SCREEN_WIDTH * 0.025
const GRID_WIDTH = COLS * TILE_SIZE + (COLS - 1) * TILE_GAP

const TILE_COLORS = [
  BAUHAUS.blue,
  BAUHAUS.red,
  BAUHAUS.yellow,
  BAUHAUS.black,
]

// Generate tile configs — cascade column by column, top to bottom
type TileConfig = {
  id: string
  col: number
  row: number
  color: string
  x: number
  y: number
  delay: number
}

function buildTiles(): TileConfig[] {
  const tiles: TileConfig[] = []
  const startX = -GRID_WIDTH / 2
  // Logo row sits at center (y=0), tiles go above and below
  const logoRowHeight = TILE_SIZE * 1.4

  let index = 0
  // Cascade columns from center outward for a radial feel
  const colOrder = [2, 1, 3, 0, 4]

  for (const col of colOrder) {
    // Tiles above the logo row
    for (let row = ROWS_ABOVE - 1; row >= 0; row--) {
      const x = startX + col * (TILE_SIZE + TILE_GAP)
      const y = -(logoRowHeight / 2) - (ROWS_ABOVE - row) * (TILE_SIZE + TILE_GAP)
      tiles.push({
        id: `tile-${col}-above-${row}`,
        col,
        row,
        color: TILE_COLORS[(col + row) % TILE_COLORS.length]!,
        x,
        y,
        delay: index,
      })
      index++
    }
    // Tiles below the logo row
    for (let row = 0; row < ROWS_BELOW; row++) {
      const x = startX + col * (TILE_SIZE + TILE_GAP)
      const y = logoRowHeight / 2 + row * (TILE_SIZE + TILE_GAP)
      tiles.push({
        id: `tile-${col}-below-${row}`,
        col,
        row: row + ROWS_ABOVE,
        color: TILE_COLORS[(col + row + 1) % TILE_COLORS.length]!,
        x,
        y,
        delay: index,
      })
      index++
    }
  }

  return tiles
}

const TILES = buildTiles()

// Three logos in a horizontal row
const LOGO_SIZE = 44
const LOGO_GAP = SCREEN_WIDTH * 0.08
const LOGOS = [
  { id: 'nvm', source: Assets.nvmWhite, delay: 0 },
  { id: 'npm', source: Assets.npmWhite, delay: 1 },
  { id: 'pnpm', source: Assets.pnpmWhite, delay: 2 },
  { id: 'bun', source: Assets.bunWhite, delay: 3 },
] as const

type Props = {
  onComplete: () => void
}

export default function PackageInstallAnimation({ onComplete }: Props) {
  const { isDark } = useTheme()
  const overlayOpacity = useSharedValue(0)

  useEffect(() => {
    overlayOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) })

    const tilesFinished = TILES.length * TILE_STAGGER + TILE_FALL_DURATION
    const logosFinished = tilesFinished + LOGOS.length * LOGO_STAGGER + LOGO_FADE_IN
    const totalDuration = logosFinished + HOLD_DURATION
    const timeout = setTimeout(() => {
      onComplete()
    }, totalDuration)

    return () => clearTimeout(timeout)
  }, [overlayOpacity, onComplete])

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }))

  const bgColor = isDark ? 'rgba(10, 10, 10, 0.96)' : BAUHAUS.black

  return (
    <Animated.View style={[styles.overlay, { backgroundColor: bgColor }, overlayStyle]}>
      {/* Mosaic tiles */}
      {TILES.map((tile) => (
        <CascadingTile key={tile.id} config={tile} />
      ))}

      {/* Logo row — centered */}
      <View style={styles.logoRow}>
        {LOGOS.map((logo) => (
          <LogoIcon key={logo.id} config={logo} tilesFinished={TILES.length * TILE_STAGGER + TILE_FALL_DURATION} />
        ))}
      </View>
    </Animated.View>
  )
}

function CascadingTile({ config }: { config: TileConfig }) {
  const translateY = useSharedValue(-SCREEN_HEIGHT * 0.5)
  const opacity = useSharedValue(0)

  useEffect(() => {
    const delay = config.delay * TILE_STAGGER

    opacity.value = withDelay(
      delay,
      withTiming(0.6, { duration: 150, easing: Easing.out(Easing.cubic) }),
    )
    translateY.value = withDelay(
      delay,
      withSpring(config.y, { damping: 14, stiffness: 100 }),
    )
  }, [config, translateY, opacity])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: config.x },
      { translateY: translateY.value },
    ],
  }))

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.tile,
        {
          width: TILE_SIZE,
          height: TILE_SIZE,
          backgroundColor: config.color,
        },
        animatedStyle,
      ]}
    />
  )
}

type LogoConfig = (typeof LOGOS)[number]

function LogoIcon({ config, tilesFinished }: { config: LogoConfig; tilesFinished: number }) {
  const opacity = useSharedValue(0)
  const scale = useSharedValue(0.5)

  useEffect(() => {
    const delay = tilesFinished + config.delay * LOGO_STAGGER

    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: LOGO_FADE_IN, easing: Easing.out(Easing.cubic) }),
    )
    scale.value = withDelay(
      delay,
      withSpring(1, { damping: 10, stiffness: 120 }),
    )
  }, [config, tilesFinished, opacity, scale])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }))

  return (
    <Animated.View style={[styles.logoContainer, animatedStyle]}>
      <Image source={config.source} style={styles.logoIcon} resizeMode="contain" />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tile: {
    position: 'absolute',
    left: '50%',
    top: '50%',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LOGO_GAP,
    zIndex: 10,
  },
  logoContainer: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  logoIcon: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
})
