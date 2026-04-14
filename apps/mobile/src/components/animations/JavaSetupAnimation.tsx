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
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

const BAUHAUS = palette.bauhaus
const JAVA_BG = palette.brand.java

// Timing
const ICON_FADE_IN = 350
const STEAM_STAGGER = 120
const HOLD_DURATION = 900

// Rising steam wisps — rects that float upward and drift, like coffee steam
const WISPS = [
  {
    id: 'wisp-1',
    color: BAUHAUS.red,
    width: SCREEN_WIDTH * 0.04,
    height: SCREEN_WIDTH * 0.18,
    startX: -SCREEN_WIDTH * 0.08,
    startY: SCREEN_HEIGHT * 0.12,
    driftX: -12,
    riseDistance: SCREEN_HEIGHT * 0.35,
    rotation: -4,
    delay: 0,
  },
  {
    id: 'wisp-2',
    color: BAUHAUS.yellow,
    width: SCREEN_WIDTH * 0.035,
    height: SCREEN_WIDTH * 0.22,
    startX: SCREEN_WIDTH * 0.04,
    startY: SCREEN_HEIGHT * 0.1,
    driftX: 8,
    riseDistance: SCREEN_HEIGHT * 0.38,
    rotation: 3,
    delay: 1,
  },
  {
    id: 'wisp-3',
    color: BAUHAUS.blue,
    width: SCREEN_WIDTH * 0.05,
    height: SCREEN_WIDTH * 0.16,
    startX: -SCREEN_WIDTH * 0.02,
    startY: SCREEN_HEIGHT * 0.14,
    driftX: -6,
    riseDistance: SCREEN_HEIGHT * 0.32,
    rotation: 6,
    delay: 2,
  },
  {
    id: 'wisp-4',
    color: BAUHAUS.black,
    width: SCREEN_WIDTH * 0.03,
    height: SCREEN_WIDTH * 0.2,
    startX: SCREEN_WIDTH * 0.1,
    startY: SCREEN_HEIGHT * 0.11,
    driftX: 14,
    riseDistance: SCREEN_HEIGHT * 0.36,
    rotation: -8,
    delay: 3,
  },
  {
    id: 'wisp-5',
    color: BAUHAUS.red,
    width: SCREEN_WIDTH * 0.045,
    height: SCREEN_WIDTH * 0.14,
    startX: -SCREEN_WIDTH * 0.14,
    startY: SCREEN_HEIGHT * 0.13,
    driftX: -10,
    riseDistance: SCREEN_HEIGHT * 0.3,
    rotation: 5,
    delay: 4,
  },
  {
    id: 'wisp-6',
    color: BAUHAUS.yellow,
    width: SCREEN_WIDTH * 0.04,
    height: SCREEN_WIDTH * 0.12,
    startX: SCREEN_WIDTH * 0.15,
    startY: SCREEN_HEIGHT * 0.15,
    driftX: 10,
    riseDistance: SCREEN_HEIGHT * 0.28,
    rotation: -3,
    delay: 5,
  },
] as const

type Props = {
  onComplete: () => void
}

export default function JavaSetupAnimation({ onComplete }: Props) {
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

    const wispsSettled = ICON_FADE_IN + WISPS.length * STEAM_STAGGER + 600
    const totalDuration = wispsSettled + HOLD_DURATION
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

  const bgColor = isDark ? 'rgba(10, 10, 10, 0.96)' : JAVA_BG

  return (
    <Animated.View style={[styles.overlay, { backgroundColor: bgColor }, overlayStyle]}>
      {WISPS.map((wisp) => (
        <SteamWisp key={wisp.id} config={wisp} />
      ))}

      <Animated.View style={[styles.iconContainer, iconStyle]}>
        <Image source={Assets.javaWhite} style={styles.icon} resizeMode="contain" />
      </Animated.View>
    </Animated.View>
  )
}

type WispConfig = (typeof WISPS)[number]

function SteamWisp({ config }: { config: WispConfig }) {
  const translateY = useSharedValue(0)
  const translateX = useSharedValue(0)
  const opacity = useSharedValue(0)

  useEffect(() => {
    const delay = ICON_FADE_IN + config.delay * STEAM_STAGGER

    // Fade in, rise, drift sideways, then fade out — loop
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.6, { duration: 300, easing: Easing.out(Easing.cubic) }),
          withTiming(0.6, { duration: 1200 }),
          withTiming(0, { duration: 500, easing: Easing.in(Easing.cubic) }),
          withTiming(0, { duration: 200 }),
        ),
        -1,
        false,
      ),
    )

    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-config.riseDistance, { duration: 2000, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
        false,
      ),
    )

    translateX.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(config.driftX, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
        false,
      ),
    )
  }, [config, translateY, translateX, opacity])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: config.startX + translateX.value },
      { translateY: config.startY + translateY.value },
      { rotate: `${config.rotation}deg` },
    ],
  }))

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wisp,
        {
          width: config.width,
          height: config.height,
          backgroundColor: config.color,
          borderRadius: config.width / 2,
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
  wisp: {
    position: 'absolute',
    left: '50%',
    top: '50%',
  },
})
