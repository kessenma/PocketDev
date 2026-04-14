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
const DOCKER_BG = palette.brand.docker

// Timing
const ICON_FADE_IN = 350
const WAVE_STAGGER = 140
const WAVE_SLIDE_DURATION = 500
const CONTAINER_STAGGER = 100
const HOLD_DURATION = 900

// Wave bars — horizontal bars below the icon that undulate left/right
const WAVE_COUNT = 5
const WAVES = Array.from({ length: WAVE_COUNT }, (_, i) => {
  const opacity = 0.15 + i * 0.08
  // Alternating widths for visual rhythm
  const widths = [0.85, 0.7, 0.92, 0.6, 0.78]
  return {
    id: `wave-${i}`,
    width: SCREEN_WIDTH * widths[i]!,
    height: SCREEN_WIDTH * 0.035,
    // Stack below center, spacing out downward
    yOffset: SCREEN_HEIGHT * 0.06 + i * (SCREEN_WIDTH * 0.055),
    // Alternating slide direction
    fromSide: i % 2 === 0 ? ('left' as const) : ('right' as const),
    // Undulation range — how far they sway
    swayRange: 20 + i * 6,
    swayDuration: 2800 + i * 400,
    opacity,
    delay: i,
  }
})

// Container blocks — small rects that float above the icon like cargo
const CONTAINERS = [
  {
    id: 'container-1',
    color: BAUHAUS.yellow,
    width: SCREEN_WIDTH * 0.08,
    height: SCREEN_WIDTH * 0.06,
    xOffset: -SCREEN_WIDTH * 0.1,
    yOffset: -SCREEN_HEIGHT * 0.1,
    bobRange: 6,
    bobDuration: 2200,
    delay: 0,
  },
  {
    id: 'container-2',
    color: BAUHAUS.red,
    width: SCREEN_WIDTH * 0.07,
    height: SCREEN_WIDTH * 0.06,
    xOffset: -SCREEN_WIDTH * 0.02,
    yOffset: -SCREEN_HEIGHT * 0.12,
    bobRange: 8,
    bobDuration: 2600,
    delay: 1,
  },
  {
    id: 'container-3',
    color: BAUHAUS.blue,
    width: SCREEN_WIDTH * 0.08,
    height: SCREEN_WIDTH * 0.06,
    xOffset: SCREEN_WIDTH * 0.06,
    yOffset: -SCREEN_HEIGHT * 0.1,
    bobRange: 5,
    bobDuration: 2400,
    delay: 2,
  },
  {
    id: 'container-4',
    color: BAUHAUS.black,
    width: SCREEN_WIDTH * 0.065,
    height: SCREEN_WIDTH * 0.06,
    xOffset: -SCREEN_WIDTH * 0.06,
    yOffset: -SCREEN_HEIGHT * 0.16,
    bobRange: 7,
    bobDuration: 2800,
    delay: 3,
  },
  {
    id: 'container-5',
    color: BAUHAUS.yellow,
    width: SCREEN_WIDTH * 0.065,
    height: SCREEN_WIDTH * 0.06,
    xOffset: SCREEN_WIDTH * 0.02,
    yOffset: -SCREEN_HEIGHT * 0.16,
    bobRange: 6,
    bobDuration: 2500,
    delay: 4,
  },
] as const

type Props = {
  onComplete: () => void
}

export default function DockerSetupAnimation({ onComplete }: Props) {
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

    const lastWaveArrives = ICON_FADE_IN + WAVE_COUNT * WAVE_STAGGER + WAVE_SLIDE_DURATION
    const lastContainerArrives = lastWaveArrives + CONTAINERS.length * CONTAINER_STAGGER + 300
    const totalDuration = lastContainerArrives + HOLD_DURATION
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

  const bgColor = isDark ? 'rgba(10, 10, 10, 0.96)' : DOCKER_BG

  return (
    <Animated.View style={[styles.overlay, { backgroundColor: bgColor }, overlayStyle]}>
      {/* Wave bars — ocean beneath the icon */}
      {WAVES.map((wave) => (
        <WaveBar key={wave.id} config={wave} isDark={isDark} />
      ))}

      {/* Container blocks — cargo floating above */}
      {CONTAINERS.map((container) => (
        <ContainerBlock key={container.id} config={container} />
      ))}

      {/* Docker icon — center */}
      <Animated.View style={[styles.iconContainer, iconStyle]}>
        <Image source={Assets.dockerWhite} style={styles.icon} resizeMode="contain" />
      </Animated.View>
    </Animated.View>
  )
}

type WaveConfig = (typeof WAVES)[number]

function WaveBar({ config, isDark }: { config: WaveConfig; isDark: boolean }) {
  const translateX = useSharedValue(
    config.fromSide === 'left' ? -SCREEN_WIDTH : SCREEN_WIDTH,
  )
  const sway = useSharedValue(0)
  const opacity = useSharedValue(0)

  useEffect(() => {
    const delay = ICON_FADE_IN + config.delay * WAVE_STAGGER

    // Slide in
    opacity.value = withDelay(
      delay,
      withTiming(config.opacity, { duration: 200, easing: Easing.out(Easing.cubic) }),
    )
    translateX.value = withDelay(
      delay,
      withSpring(0, { damping: 16, stiffness: 90 }),
    )

    // Start undulating after arrival
    sway.value = withDelay(
      delay + WAVE_SLIDE_DURATION,
      withRepeat(
        withSequence(
          withTiming(config.swayRange, {
            duration: config.swayDuration,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(-config.swayRange, {
            duration: config.swayDuration,
            easing: Easing.inOut(Easing.sin),
          }),
        ),
        -1,
        true,
      ),
    )
  }, [config, translateX, sway, opacity])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value + sway.value },
      { translateY: config.yOffset },
    ],
  }))

  const barColor = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.3)'

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wave,
        {
          width: config.width,
          height: config.height,
          backgroundColor: barColor,
          marginLeft: -config.width / 2,
          borderRadius: config.height / 2,
        },
        animatedStyle,
      ]}
    />
  )
}

type ContainerConfig = (typeof CONTAINERS)[number]

function ContainerBlock({ config }: { config: ContainerConfig }) {
  const opacity = useSharedValue(0)
  const scale = useSharedValue(0)
  const bob = useSharedValue(0)

  useEffect(() => {
    // Containers appear after waves
    const wavesSettled = ICON_FADE_IN + WAVE_COUNT * WAVE_STAGGER + WAVE_SLIDE_DURATION
    const delay = wavesSettled + config.delay * CONTAINER_STAGGER

    opacity.value = withDelay(
      delay,
      withTiming(0.85, { duration: 200, easing: Easing.out(Easing.cubic) }),
    )
    scale.value = withDelay(
      delay,
      withSpring(1, { damping: 10, stiffness: 120 }),
    )

    // Gentle bobbing
    bob.value = withDelay(
      delay + 200,
      withRepeat(
        withSequence(
          withTiming(-config.bobRange, {
            duration: config.bobDuration,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(config.bobRange, {
            duration: config.bobDuration,
            easing: Easing.inOut(Easing.sin),
          }),
        ),
        -1,
        true,
      ),
    )
  }, [config, opacity, scale, bob])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: config.xOffset },
      { translateY: config.yOffset + bob.value },
      { scale: scale.value },
    ],
  }))

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
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
  wave: {
    position: 'absolute',
    left: '50%',
    top: '50%',
  },
  container: {
    position: 'absolute',
    left: '50%',
    top: '50%',
  },
})
