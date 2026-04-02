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
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const BAUHAUS = palette.bauhaus
const RUST_BG = palette.brand.rust

// Timing
const ICON_FADE_IN = 350
const COG_STAGGER = 150
const HOLD_DURATION = 900

// Interlocking cog shapes — circles that rotate slowly in alternating directions
const COGS = [
  {
    id: 'cog-tl',
    color: BAUHAUS.black,
    size: SCREEN_WIDTH * 0.32,
    x: -SCREEN_WIDTH * 0.18,
    y: -SCREEN_WIDTH * 0.2,
    direction: 1,
    delay: 0,
  },
  {
    id: 'cog-tr',
    color: BAUHAUS.yellow,
    size: SCREEN_WIDTH * 0.24,
    x: SCREEN_WIDTH * 0.2,
    y: -SCREEN_WIDTH * 0.16,
    direction: -1,
    delay: 1,
  },
  {
    id: 'cog-bl',
    color: BAUHAUS.blue,
    size: SCREEN_WIDTH * 0.26,
    x: -SCREEN_WIDTH * 0.16,
    y: SCREEN_WIDTH * 0.22,
    direction: -1,
    delay: 2,
  },
  {
    id: 'cog-br',
    color: BAUHAUS.black,
    size: SCREEN_WIDTH * 0.2,
    x: SCREEN_WIDTH * 0.22,
    y: SCREEN_WIDTH * 0.18,
    direction: 1,
    delay: 3,
  },
  {
    id: 'cog-center-l',
    color: BAUHAUS.red,
    size: SCREEN_WIDTH * 0.14,
    x: -SCREEN_WIDTH * 0.28,
    y: SCREEN_WIDTH * 0.02,
    direction: 1,
    delay: 4,
  },
  {
    id: 'cog-center-r',
    color: BAUHAUS.yellow,
    size: SCREEN_WIDTH * 0.16,
    x: SCREEN_WIDTH * 0.3,
    y: -SCREEN_WIDTH * 0.01,
    direction: -1,
    delay: 5,
  },
] as const

type Props = {
  onComplete: () => void
}

export default function RustSetupAnimation({ onComplete }: Props) {
  const { isDark } = useTheme()
  const overlayOpacity = useSharedValue(0)
  const { triggerExit } = useExitFade(overlayOpacity, onComplete)
  const iconOpacity = useSharedValue(0)
  const iconScale = useSharedValue(0.4)

  useEffect(() => {
    overlayOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) })

    const cogsSettled = ICON_FADE_IN + COGS.length * COG_STAGGER + 400
    iconOpacity.value = withDelay(
      cogsSettled * 0.5,
      withTiming(1, { duration: ICON_FADE_IN, easing: Easing.out(Easing.cubic) }),
    )
    iconScale.value = withDelay(
      cogsSettled * 0.5,
      withSpring(1, { damping: 12, stiffness: 100 }),
    )

    const totalDuration = cogsSettled + HOLD_DURATION
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

  const bgColor = isDark ? 'rgba(10, 10, 10, 0.96)' : RUST_BG

  return (
    <Animated.View style={[styles.overlay, { backgroundColor: bgColor }, overlayStyle]}>
      {COGS.map((cog) => (
        <CogShape key={cog.id} config={cog} />
      ))}

      <Animated.View style={[styles.iconContainer, iconStyle]}>
        <Image source={Assets.rustWhite} style={styles.icon} resizeMode="contain" />
      </Animated.View>
    </Animated.View>
  )
}

type CogConfig = (typeof COGS)[number]

function CogShape({ config }: { config: CogConfig }) {
  const scale = useSharedValue(0)
  const opacity = useSharedValue(0)
  const rotation = useSharedValue(0)

  useEffect(() => {
    const delay = config.delay * COG_STAGGER

    opacity.value = withDelay(
      delay,
      withTiming(0.5, { duration: 200, easing: Easing.out(Easing.cubic) }),
    )
    scale.value = withDelay(
      delay,
      withSpring(1, { damping: 12, stiffness: 80 }),
    )
    // Slow continuous rotation
    rotation.value = withDelay(
      delay,
      withRepeat(
        withTiming(config.direction * 360, { duration: 16000, easing: Easing.linear }),
        -1,
        false,
      ),
    )
  }, [config, scale, opacity, rotation])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: config.x },
      { translateY: config.y },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }))

  // Cog = circle with notched border (simulated with dashed border)
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.cog,
        {
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          borderColor: config.color,
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
  cog: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    borderWidth: 6,
    borderStyle: 'dashed',
  },
})
