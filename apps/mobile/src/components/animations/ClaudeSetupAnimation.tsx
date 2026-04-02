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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

const BAUHAUS = palette.bauhaus
const CLAUDE_BG = palette.brand.claude

// Timing
const ICON_FADE_IN = 350
const RING_STAGGER = 200
const RING_EXPAND_DURATION = 800
const HOLD_DURATION = 900

// Concentric rings that expand outward from center
const RING_COUNT = 4
const RING_SIZES = [0.3, 0.5, 0.72, 0.96] // as fraction of screen width

// Orbiting accent shapes — rotate slowly around the icon
const ACCENTS = [
  {
    id: 'orbit-blue-circle',
    shape: 'circle' as const,
    color: BAUHAUS.blue,
    size: SCREEN_WIDTH * 0.09,
    orbitRadius: SCREEN_WIDTH * 0.28,
    startAngle: -40,
    delay: 0,
  },
  {
    id: 'orbit-red-rect',
    shape: 'rect' as const,
    color: BAUHAUS.red,
    width: SCREEN_WIDTH * 0.12,
    height: SCREEN_WIDTH * 0.05,
    orbitRadius: SCREEN_WIDTH * 0.22,
    startAngle: 130,
    rotation: 15,
    delay: 1,
  },
  {
    id: 'orbit-yellow-square',
    shape: 'rect' as const,
    color: BAUHAUS.yellow,
    width: SCREEN_WIDTH * 0.07,
    height: SCREEN_WIDTH * 0.07,
    orbitRadius: SCREEN_WIDTH * 0.35,
    startAngle: 220,
    rotation: -10,
    delay: 2,
  },
  {
    id: 'orbit-black-bar',
    shape: 'rect' as const,
    color: BAUHAUS.black,
    width: SCREEN_WIDTH * 0.15,
    height: SCREEN_WIDTH * 0.04,
    orbitRadius: SCREEN_WIDTH * 0.32,
    startAngle: 60,
    rotation: 30,
    delay: 3,
  },
] as const

type Props = {
  onComplete: () => void
}

export default function ClaudeSetupAnimation({ onComplete }: Props) {
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
      withSpring(1, { damping: 12, stiffness: 100 }),
    )

    const lastRingDone = ICON_FADE_IN + RING_COUNT * RING_STAGGER + RING_EXPAND_DURATION
    const totalDuration = lastRingDone + HOLD_DURATION
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

  const bgColor = isDark ? 'rgba(10, 10, 10, 0.96)' : CLAUDE_BG

  return (
    <Animated.View style={[styles.overlay, { backgroundColor: bgColor }, overlayStyle]}>
      {/* Expanding rings */}
      {RING_SIZES.map((sizeFrac, i) => (
        <ExpandingRing key={i} index={i} sizeFraction={sizeFrac} isDark={isDark} />
      ))}

      {/* Orbiting accent shapes */}
      {ACCENTS.map((accent) => (
        <OrbitingAccent key={accent.id} config={accent} />
      ))}

      {/* Claude icon — center */}
      <Animated.View style={[styles.iconContainer, iconStyle]}>
        <Image
          source={isDark ? Assets.claudeWhite : Assets.claudeBlack}
          style={styles.icon}
          resizeMode="contain"
        />
      </Animated.View>
    </Animated.View>
  )
}

function ExpandingRing({
  index,
  sizeFraction,
  isDark,
}: {
  index: number
  sizeFraction: number
  isDark: boolean
}) {
  const scale = useSharedValue(0)
  const opacity = useSharedValue(0)

  const ringSize = SCREEN_WIDTH * sizeFraction

  useEffect(() => {
    const delay = ICON_FADE_IN + index * RING_STAGGER

    opacity.value = withDelay(
      delay,
      withTiming(isDark ? 0.2 : 0.3, { duration: RING_EXPAND_DURATION * 0.4, easing: Easing.out(Easing.cubic) }),
    )
    scale.value = withDelay(
      delay,
      withSpring(1, { damping: 18, stiffness: 80 }),
    )
  }, [index, isDark, scale, opacity])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }))

  const borderColor = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(26,26,26,0.18)'

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ring,
        {
          width: ringSize,
          height: ringSize,
          borderRadius: ringSize / 2,
          borderColor,
          marginLeft: -ringSize / 2,
          marginTop: -ringSize / 2,
        },
        animatedStyle,
      ]}
    />
  )
}

type AccentConfig = (typeof ACCENTS)[number]

function OrbitingAccent({ config }: { config: AccentConfig }) {
  const opacity = useSharedValue(0)
  const rotation = useSharedValue<number>(config.startAngle)

  useEffect(() => {
    const delay = ICON_FADE_IN + config.delay * RING_STAGGER

    opacity.value = withDelay(
      delay,
      withTiming(0.7, { duration: 300, easing: Easing.out(Easing.cubic) }),
    )

    // Slow continuous rotation around the orbit
    rotation.value = withDelay(
      delay,
      withRepeat(
        withTiming(config.startAngle + 360, { duration: 20000, easing: Easing.linear }),
        -1,
        false,
      ),
    )
  }, [config, opacity, rotation])

  const animatedStyle = useAnimatedStyle(() => {
    const r = (rotation.value * Math.PI) / 180
    return {
      opacity: opacity.value,
      transform: [
        { translateX: Math.cos(r) * config.orbitRadius },
        { translateY: Math.sin(r) * config.orbitRadius },
        { rotate: `${'rotation' in config ? config.rotation : 0}deg` },
      ],
    }
  })

  const isCircle = config.shape === 'circle'
  const w = isCircle ? config.size : config.width
  const h = isCircle ? config.size : config.height

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.accent,
        {
          width: w,
          height: h,
          borderRadius: isCircle ? w / 2 : 0,
          backgroundColor: config.color,
          marginLeft: -w / 2,
          marginTop: -h / 2,
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
  ring: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    borderWidth: 2,
  },
  accent: {
    position: 'absolute',
    left: '50%',
    top: '50%',
  },
})
