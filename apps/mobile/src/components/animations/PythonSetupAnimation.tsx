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

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const BAUHAUS = palette.bauhaus

const PYTHON_BG = palette.brand.python

// Timing
const ICON_FADE_IN = 350
const SEGMENT_STAGGER = 70
const SEGMENT_DURATION = 400
const HOLD_DURATION = 800

// Spiral segments — Bauhaus shapes placed along a spiral path coiling inward
// Each starts off-screen at its angle and springs to its final position
const SEGMENT_COUNT = 16
const SPIRAL_TURNS = 1.8

type SegmentConfig = {
  id: string
  shape: 'circle' | 'rect'
  color: string
  width: number
  height: number
  rotation: number
  x: number
  y: number
  fromX: number
  fromY: number
  delay: number
}

function buildSegments(): SegmentConfig[] {
  const segments: SegmentConfig[] = []
  const colors = [BAUHAUS.blue, BAUHAUS.yellow, BAUHAUS.red, BAUHAUS.black]
  const shapes: Array<'circle' | 'rect'> = ['rect', 'circle', 'rect', 'rect']
  const maxRadius = SCREEN_WIDTH * 0.38

  for (let i = 0; i < SEGMENT_COUNT; i++) {
    const t = i / (SEGMENT_COUNT - 1)
    const angle = t * SPIRAL_TURNS * Math.PI * 2 - Math.PI / 2
    // Spiral: radius decreases as we go inward
    const radius = maxRadius * (1 - t * 0.75)

    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius

    // Start position: further out along the same angle
    const startRadius = maxRadius * 1.8
    const fromX = Math.cos(angle) * startRadius
    const fromY = Math.sin(angle) * startRadius

    const shape = shapes[i % shapes.length]!
    const isCircle = shape === 'circle'
    // Size decreases toward center
    const sizeFactor = 0.06 + (1 - t) * 0.04
    const baseSize = SCREEN_WIDTH * sizeFactor

    segments.push({
      id: `seg-${i}`,
      shape,
      color: colors[i % colors.length]!,
      width: isCircle ? baseSize : baseSize * (0.8 + (i % 3) * 0.4),
      height: isCircle ? baseSize : baseSize * 0.7,
      rotation: (angle * 180) / Math.PI + (isCircle ? 0 : 15),
      x,
      y,
      fromX,
      fromY,
      delay: i,
    })
  }

  return segments
}

const SEGMENTS = buildSegments()

type Props = {
  onComplete: () => void
}

export default function PythonSetupAnimation({ onComplete }: Props) {
  const { isDark } = useTheme()
  const overlayOpacity = useSharedValue(0)
  const { triggerExit } = useExitFade(overlayOpacity, onComplete)
  const iconOpacity = useSharedValue(0)
  const iconScale = useSharedValue(0.4)

  useEffect(() => {
    overlayOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) })

    // Icon appears after spiral is mostly built
    const spiralBuilt = SEGMENT_COUNT * SEGMENT_STAGGER + SEGMENT_DURATION * 0.6
    iconOpacity.value = withDelay(
      spiralBuilt,
      withTiming(1, { duration: ICON_FADE_IN, easing: Easing.out(Easing.cubic) }),
    )
    iconScale.value = withDelay(
      spiralBuilt,
      withSpring(1, { damping: 10, stiffness: 100 }),
    )

    const totalDuration = spiralBuilt + ICON_FADE_IN + HOLD_DURATION
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

  const bgColor = isDark ? 'rgba(10, 10, 10, 0.96)' : PYTHON_BG

  return (
    <Animated.View style={[styles.overlay, { backgroundColor: bgColor }, overlayStyle]}>
      {/* Spiral segments */}
      {SEGMENTS.map((seg) => (
        <SpiralSegment key={seg.id} config={seg} />
      ))}

      {/* Python icon — center */}
      <Animated.View style={[styles.iconContainer, iconStyle]}>
        <Image source={Assets.pythonWhite} style={styles.icon} resizeMode="contain" />
      </Animated.View>
    </Animated.View>
  )
}

function SpiralSegment({ config }: { config: SegmentConfig }) {
  const translateX = useSharedValue(config.fromX)
  const translateY = useSharedValue(config.fromY)
  const opacity = useSharedValue(0)

  useEffect(() => {
    const delay = config.delay * SEGMENT_STAGGER

    opacity.value = withDelay(
      delay,
      withTiming(0.7, { duration: 150, easing: Easing.out(Easing.cubic) }),
    )
    translateX.value = withDelay(
      delay,
      withSpring(config.x, { damping: 14, stiffness: 80 }),
    )
    translateY.value = withDelay(
      delay,
      withSpring(config.y, { damping: 14, stiffness: 80 }),
    )
  }, [config, translateX, translateY, opacity])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${config.rotation}deg` },
    ],
  }))

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.segment,
        {
          width: config.width,
          height: config.height,
          borderRadius: config.shape === 'circle' ? config.width / 2 : 0,
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
  segment: {
    position: 'absolute',
    left: '50%',
    top: '50%',
  },
})
