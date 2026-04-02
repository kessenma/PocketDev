import React, { useEffect } from 'react'
import { Dimensions, Image, StyleSheet } from 'react-native'
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
const CODEX_BG = palette.brand.codex

// Timing
const ICON_FADE_IN = 300
const SLAB_STAGGER = 100
const SLAB_DURATION = 450
const HOLD_DURATION = 800

// Horizontal slabs that slide in from alternating sides and stack around the icon
const SLABS = [
  // Above the icon — stack upward
  {
    id: 'slab-top-1',
    color: BAUHAUS.blue,
    width: SCREEN_WIDTH * 0.55,
    height: SCREEN_WIDTH * 0.045,
    toY: -SCREEN_HEIGHT * 0.04,
    fromSide: 'left' as const,
    delay: 0,
  },
  {
    id: 'slab-top-2',
    color: BAUHAUS.yellow,
    width: SCREEN_WIDTH * 0.38,
    height: SCREEN_WIDTH * 0.045,
    toY: -SCREEN_HEIGHT * 0.07,
    fromSide: 'right' as const,
    delay: 1,
  },
  {
    id: 'slab-top-3',
    color: BAUHAUS.red,
    width: SCREEN_WIDTH * 0.62,
    height: SCREEN_WIDTH * 0.045,
    toY: -SCREEN_HEIGHT * 0.1,
    fromSide: 'left' as const,
    delay: 2,
  },
  {
    id: 'slab-top-4',
    color: BAUHAUS.black,
    width: SCREEN_WIDTH * 0.3,
    height: SCREEN_WIDTH * 0.045,
    toY: -SCREEN_HEIGHT * 0.13,
    fromSide: 'right' as const,
    delay: 3,
  },
  // Below the icon — stack downward
  {
    id: 'slab-bot-1',
    color: BAUHAUS.black,
    width: SCREEN_WIDTH * 0.48,
    height: SCREEN_WIDTH * 0.045,
    toY: SCREEN_HEIGHT * 0.04,
    fromSide: 'right' as const,
    delay: 4,
  },
  {
    id: 'slab-bot-2',
    color: BAUHAUS.blue,
    width: SCREEN_WIDTH * 0.35,
    height: SCREEN_WIDTH * 0.045,
    toY: SCREEN_HEIGHT * 0.07,
    fromSide: 'left' as const,
    delay: 5,
  },
  {
    id: 'slab-bot-3',
    color: BAUHAUS.yellow,
    width: SCREEN_WIDTH * 0.58,
    height: SCREEN_WIDTH * 0.045,
    toY: SCREEN_HEIGHT * 0.1,
    fromSide: 'right' as const,
    delay: 6,
  },
  {
    id: 'slab-bot-4',
    color: BAUHAUS.red,
    width: SCREEN_WIDTH * 0.42,
    height: SCREEN_WIDTH * 0.045,
    toY: SCREEN_HEIGHT * 0.13,
    fromSide: 'left' as const,
    delay: 7,
  },
] as const

type Props = {
  onComplete: () => void
}

export default function CodexSetupAnimation({ onComplete }: Props) {
  const { isDark } = useTheme()
  const overlayOpacity = useSharedValue(0)
  const iconOpacity = useSharedValue(0)
  const iconScale = useSharedValue(0.6)

  useEffect(() => {
    overlayOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) })

    iconOpacity.value = withDelay(
      80,
      withTiming(1, { duration: ICON_FADE_IN, easing: Easing.out(Easing.cubic) }),
    )
    iconScale.value = withDelay(
      80,
      withSpring(1, { damping: 14, stiffness: 130 }),
    )

    const lastSlabArrives = ICON_FADE_IN + SLABS.length * SLAB_STAGGER + SLAB_DURATION
    const totalDuration = lastSlabArrives + HOLD_DURATION
    const timeout = setTimeout(() => {
      onComplete()
    }, totalDuration)

    return () => clearTimeout(timeout)
  }, [overlayOpacity, iconOpacity, iconScale, onComplete])

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }))

  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value }],
  }))

  const bgColor = isDark ? 'rgba(10, 10, 10, 0.96)' : CODEX_BG

  return (
    <Animated.View style={[styles.overlay, { backgroundColor: bgColor }, overlayStyle]}>
      {/* Stacking slabs */}
      {SLABS.map((slab) => (
        <StackingSlab key={slab.id} config={slab} />
      ))}

      {/* Codex icon — center */}
      <Animated.View style={[styles.iconContainer, iconStyle]}>
        <Image source={Assets.codexWhite} style={styles.icon} resizeMode="contain" />
      </Animated.View>
    </Animated.View>
  )
}

type SlabConfig = (typeof SLABS)[number]

function StackingSlab({ config }: { config: SlabConfig }) {
  const translateX = useSharedValue(
    config.fromSide === 'left' ? -SCREEN_WIDTH : SCREEN_WIDTH,
  )
  const opacity = useSharedValue(0)

  useEffect(() => {
    const delay = ICON_FADE_IN + config.delay * SLAB_STAGGER

    opacity.value = withDelay(
      delay,
      withTiming(0.7, { duration: 150, easing: Easing.out(Easing.cubic) }),
    )
    translateX.value = withDelay(
      delay,
      withSpring(0, { damping: 18, stiffness: 100 }),
    )
  }, [config, translateX, opacity])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }, { translateY: config.toY }],
  }))

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.slab,
        {
          width: config.width,
          height: config.height,
          backgroundColor: config.color,
          marginLeft: -config.width / 2,
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
  slab: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginTop: -SCREEN_WIDTH * 0.045 / 2,
  },
})
