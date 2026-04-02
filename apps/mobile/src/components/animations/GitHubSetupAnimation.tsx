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

// Timing
const ICON_FADE_IN = 300
const SHAPE_STAGGER = 120
const SHAPE_DURATION = 500
const HOLD_DURATION = 800

// Shape configs: each slides in from off-screen and docks at a final position
const SHAPES = [
  {
    id: 'blue-circle',
    shape: 'circle' as const,
    color: BAUHAUS.blue,
    size: SCREEN_WIDTH * 0.28,
    // Slides in from the left, docks left of center
    fromX: -SCREEN_WIDTH * 0.5,
    fromY: 0,
    toX: -SCREEN_WIDTH * 0.22,
    toY: -SCREEN_HEIGHT * 0.08,
    delay: 0,
  },
  {
    id: 'red-bar-top',
    shape: 'rect' as const,
    color: BAUHAUS.red,
    width: SCREEN_WIDTH * 0.4,
    height: SCREEN_WIDTH * 0.08,
    rotation: -6,
    // Slides down from top
    fromX: SCREEN_WIDTH * 0.06,
    fromY: -SCREEN_HEIGHT * 0.4,
    toX: SCREEN_WIDTH * 0.06,
    toY: -SCREEN_HEIGHT * 0.16,
    delay: 1,
  },
  {
    id: 'yellow-rect',
    shape: 'rect' as const,
    color: BAUHAUS.yellow,
    width: SCREEN_WIDTH * 0.14,
    height: SCREEN_WIDTH * 0.36,
    rotation: 4,
    // Slides in from the right
    fromX: SCREEN_WIDTH * 0.5,
    fromY: SCREEN_HEIGHT * 0.04,
    toX: SCREEN_WIDTH * 0.24,
    toY: SCREEN_HEIGHT * 0.04,
    delay: 2,
  },
  {
    id: 'black-bar-bottom',
    shape: 'rect' as const,
    color: BAUHAUS.black,
    width: SCREEN_WIDTH * 0.52,
    height: SCREEN_WIDTH * 0.06,
    rotation: 0,
    // Slides up from bottom
    fromX: -SCREEN_WIDTH * 0.08,
    fromY: SCREEN_HEIGHT * 0.4,
    toX: -SCREEN_WIDTH * 0.08,
    toY: SCREEN_HEIGHT * 0.18,
    delay: 3,
  },
  {
    id: 'small-blue-dot',
    shape: 'circle' as const,
    color: BAUHAUS.blue,
    size: SCREEN_WIDTH * 0.08,
    // Pops in at top-right
    fromX: SCREEN_WIDTH * 0.3,
    fromY: -SCREEN_HEIGHT * 0.3,
    toX: SCREEN_WIDTH * 0.18,
    toY: -SCREEN_HEIGHT * 0.12,
    delay: 4,
  },
  {
    id: 'small-red-square',
    shape: 'rect' as const,
    color: BAUHAUS.red,
    width: SCREEN_WIDTH * 0.1,
    height: SCREEN_WIDTH * 0.1,
    rotation: 20,
    // Pops in at bottom-left
    fromX: -SCREEN_WIDTH * 0.35,
    fromY: SCREEN_HEIGHT * 0.3,
    toX: -SCREEN_WIDTH * 0.16,
    toY: SCREEN_HEIGHT * 0.15,
    delay: 5,
  },
] as const

type Props = {
  onComplete: () => void
}

export default function GitHubSetupAnimation({ onComplete }: Props) {
  const { isDark } = useTheme()
  const overlayOpacity = useSharedValue(0)
  const { triggerExit } = useExitFade(overlayOpacity, onComplete)
  const iconOpacity = useSharedValue(0)
  const iconScale = useSharedValue(0.7)

  useEffect(() => {
    // Fade in overlay
    overlayOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) })

    // Fade in the GitHub icon
    iconOpacity.value = withDelay(
      100,
      withTiming(1, { duration: ICON_FADE_IN, easing: Easing.out(Easing.cubic) }),
    )
    iconScale.value = withDelay(
      100,
      withSpring(1, { damping: 14, stiffness: 120 }),
    )

    // Total: icon fade + all shapes arrive + hold
    const lastShapeArrives = ICON_FADE_IN + SHAPES.length * SHAPE_STAGGER + SHAPE_DURATION
    const totalDuration = lastShapeArrives + HOLD_DURATION
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

  const bgColor = isDark ? 'rgba(10, 10, 10, 0.96)' : BAUHAUS.black

  return (
    <Animated.View style={[styles.overlay, { backgroundColor: bgColor }, overlayStyle]}>
      {/* Geometric shapes that assemble around the icon */}
      {SHAPES.map((shape) => (
        <AssemblingShape key={shape.id} config={shape} />
      ))}

      {/* GitHub icon — center */}
      <Animated.View style={[styles.iconContainer, iconStyle]}>
        <Image source={Assets.githubWhite} style={styles.icon} resizeMode="contain" />
      </Animated.View>
    </Animated.View>
  )
}

type ShapeConfig = (typeof SHAPES)[number]

function AssemblingShape({ config }: { config: ShapeConfig }) {
  const translateX = useSharedValue(config.fromX)
  const translateY = useSharedValue(config.fromY)
  const opacity = useSharedValue(0)

  useEffect(() => {
    const shapeDelay = ICON_FADE_IN + config.delay * SHAPE_STAGGER

    opacity.value = withDelay(
      shapeDelay,
      withTiming(1, { duration: 150, easing: Easing.out(Easing.cubic) }),
    )
    translateX.value = withDelay(
      shapeDelay,
      withSpring(config.toX, { damping: 16, stiffness: 90 }),
    )
    translateY.value = withDelay(
      shapeDelay,
      withSpring(config.toY, { damping: 16, stiffness: 90 }),
    )
  }, [config, translateX, translateY, opacity])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${'rotation' in config ? config.rotation : 0}deg` },
    ],
  }))

  const isCircle = config.shape === 'circle'
  const w = isCircle ? config.size : config.width
  const h = isCircle ? config.size : config.height

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.shape,
        {
          width: w,
          height: h,
          borderRadius: isCircle ? w / 2 : 0,
          backgroundColor: config.color,
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
  shape: {
    position: 'absolute',
  },
})
