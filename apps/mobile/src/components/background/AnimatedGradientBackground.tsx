import React, { useEffect, useState } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

// Bauhaus palette matching the web SVG graphics
const BAUHAUS = {
  blue: '#2D5FE5',
  red: '#D93025',
  yellow: '#E8B83D',
  black: '#1a1a1a',
} as const

type ShapeConfig = {
  id: string
  shape: 'circle' | 'rect'
  color: string
  width: number
  height: number
  initialX: number
  initialY: number
  rangeX: number
  rangeY: number
  rotation?: number
  breathe?: boolean
  duration: number
  delay: number
  opacity: number
}

type Props = {
  colors: {
    background: string
    backgroundSecondary: string
    primary: string
    primaryHover: string
    accent: string
  }
  isDark: boolean
  variant?: 'connect' | 'setup'
  children?: React.ReactNode
}

function AnimatedShape({ config }: { config: ShapeConfig }) {
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const scale = useSharedValue(1)

  useEffect(() => {
    translateX.value = withDelay(
      config.delay,
      withRepeat(
        withSequence(
          withTiming(config.rangeX, {
            duration: config.duration,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(-config.rangeX * 0.7, {
            duration: config.duration * 0.8,
            easing: Easing.inOut(Easing.sin),
          }),
        ),
        -1,
        true,
      ),
    )

    translateY.value = withDelay(
      config.delay + 500,
      withRepeat(
        withSequence(
          withTiming(-config.rangeY, {
            duration: config.duration * 1.1,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(config.rangeY * 0.6, {
            duration: config.duration * 0.9,
            easing: Easing.inOut(Easing.sin),
          }),
        ),
        -1,
        true,
      ),
    )

    if (config.breathe) {
      scale.value = withDelay(
        config.delay,
        withRepeat(
          withTiming(1.08, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
          -1,
          true,
        ),
      )
    }
  }, [config.delay, config.duration, config.rangeX, config.rangeY, config.breathe, translateX, translateY, scale])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${config.rotation ?? 0}deg` },
      { scale: scale.value },
    ],
  }))

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.blob,
        {
          left: config.initialX - config.width / 2,
          top: config.initialY - config.height / 2,
          width: config.width,
          height: config.height,
          borderRadius: config.shape === 'circle' ? config.width / 2 : 0,
          backgroundColor: config.color,
          opacity: config.opacity,
        },
        animatedStyle,
      ]}
    />
  )
}

export default function AnimatedGradientBackground({
  colors,
  isDark,
  variant = 'connect',
  children,
}: Props) {
  const overlayStyle = {
    backgroundColor: isDark ? 'rgba(10,10,10,0.72)' : 'rgba(250,250,250,0.82)',
  }
  const [animDone, setAnimDone] = useState(false)
  const contentOpacity = useSharedValue(0)
  const contentScale = useSharedValue(0.985)

  useEffect(() => {
    contentOpacity.value = withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) }, () => {
      runOnJS(setAnimDone)(true)
    })
    contentScale.value = withSpring(1, { damping: 18, stiffness: 150 })
  }, [contentOpacity, contentScale])

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ scale: contentScale.value }],
  }))

  const shapeConfigs: ShapeConfig[] =
    variant === 'setup'
      ? [
          // Large blue circle — dominant, top-left, breathes like web arch-graphic
          {
            id: 'blue-circle',
            shape: 'circle',
            color: BAUHAUS.blue,
            width: SCREEN_WIDTH * 0.7,
            height: SCREEN_WIDTH * 0.7,
            initialX: SCREEN_WIDTH * 0.15,
            initialY: SCREEN_HEIGHT * 0.12,
            rangeX: 18,
            rangeY: 14,
            breathe: true,
            duration: 6200,
            delay: 0,
            opacity: isDark ? 0.2 : 0.14,
          },
          // Red square — top-right accent
          {
            id: 'red-square',
            shape: 'rect',
            color: BAUHAUS.red,
            width: SCREEN_WIDTH * 0.28,
            height: SCREEN_WIDTH * 0.28,
            initialX: SCREEN_WIDTH * 0.82,
            initialY: SCREEN_HEIGHT * 0.08,
            rangeX: 12,
            rangeY: 16,
            rotation: 12,
            duration: 7000,
            delay: 300,
            opacity: isDark ? 0.18 : 0.12,
          },
          // Yellow horizontal bar — mid-screen
          {
            id: 'yellow-bar',
            shape: 'rect',
            color: BAUHAUS.yellow,
            width: SCREEN_WIDTH * 0.55,
            height: SCREEN_WIDTH * 0.14,
            initialX: SCREEN_WIDTH * 0.6,
            initialY: SCREEN_HEIGHT * 0.42,
            rangeX: 20,
            rangeY: 10,
            rotation: -6,
            duration: 7600,
            delay: 180,
            opacity: isDark ? 0.2 : 0.14,
          },
          // Small black circle — lower-left
          {
            id: 'black-circle',
            shape: 'circle',
            color: BAUHAUS.black,
            width: SCREEN_WIDTH * 0.22,
            height: SCREEN_WIDTH * 0.22,
            initialX: SCREEN_WIDTH * 0.2,
            initialY: SCREEN_HEIGHT * 0.72,
            rangeX: 14,
            rangeY: 18,
            duration: 6800,
            delay: 540,
            opacity: isDark ? 0.16 : 0.1,
          },
          // Blue vertical bar — bottom-right
          {
            id: 'blue-bar',
            shape: 'rect',
            color: BAUHAUS.blue,
            width: SCREEN_WIDTH * 0.12,
            height: SCREEN_WIDTH * 0.5,
            initialX: SCREEN_WIDTH * 0.85,
            initialY: SCREEN_HEIGHT * 0.7,
            rangeX: 10,
            rangeY: 22,
            rotation: 4,
            duration: 8200,
            delay: 760,
            opacity: isDark ? 0.14 : 0.1,
          },
        ]
      : [
          // Large blue circle — hero element, breathes
          {
            id: 'blue-circle',
            shape: 'circle',
            color: BAUHAUS.blue,
            width: SCREEN_WIDTH * 0.75,
            height: SCREEN_WIDTH * 0.75,
            initialX: SCREEN_WIDTH * 0.25,
            initialY: SCREEN_HEIGHT * 0.15,
            rangeX: 24,
            rangeY: 20,
            breathe: true,
            duration: 5200,
            delay: 0,
            opacity: isDark ? 0.22 : 0.16,
          },
          // Red square — offset right, tilted
          {
            id: 'red-square',
            shape: 'rect',
            color: BAUHAUS.red,
            width: SCREEN_WIDTH * 0.32,
            height: SCREEN_WIDTH * 0.32,
            initialX: SCREEN_WIDTH * 0.78,
            initialY: SCREEN_HEIGHT * 0.22,
            rangeX: 18,
            rangeY: 22,
            rotation: 15,
            duration: 4800,
            delay: 350,
            opacity: isDark ? 0.2 : 0.14,
          },
          // Yellow wide bar — horizontal band across middle
          {
            id: 'yellow-bar',
            shape: 'rect',
            color: BAUHAUS.yellow,
            width: SCREEN_WIDTH * 0.65,
            height: SCREEN_WIDTH * 0.16,
            initialX: SCREEN_WIDTH * 0.5,
            initialY: SCREEN_HEIGHT * 0.48,
            rangeX: 30,
            rangeY: 12,
            rotation: -8,
            duration: 4700,
            delay: 180,
            opacity: isDark ? 0.18 : 0.12,
          },
          // Black tall rect — vertical accent, left side
          {
            id: 'black-rect',
            shape: 'rect',
            color: BAUHAUS.black,
            width: SCREEN_WIDTH * 0.14,
            height: SCREEN_WIDTH * 0.56,
            initialX: SCREEN_WIDTH * 0.12,
            initialY: SCREEN_HEIGHT * 0.55,
            rangeX: 16,
            rangeY: 26,
            rotation: 3,
            duration: 5600,
            delay: 650,
            opacity: isDark ? 0.18 : 0.12,
          },
          // Small red circle — bottom-right punctuation
          {
            id: 'red-circle',
            shape: 'circle',
            color: BAUHAUS.red,
            width: SCREEN_WIDTH * 0.18,
            height: SCREEN_WIDTH * 0.18,
            initialX: SCREEN_WIDTH * 0.75,
            initialY: SCREEN_HEIGHT * 0.78,
            rangeX: 20,
            rangeY: 16,
            duration: 4200,
            delay: 500,
            opacity: isDark ? 0.16 : 0.1,
          },
          // Blue bar — bottom, wider
          {
            id: 'blue-bar',
            shape: 'rect',
            color: BAUHAUS.blue,
            width: SCREEN_WIDTH * 0.48,
            height: SCREEN_WIDTH * 0.1,
            initialX: SCREEN_WIDTH * 0.4,
            initialY: SCREEN_HEIGHT * 0.88,
            rangeX: 22,
            rangeY: 10,
            rotation: 6,
            duration: 6000,
            delay: 400,
            opacity: isDark ? 0.14 : 0.1,
          },
        ]

  return (
    <View style={styles.container}>
      <View style={[styles.baseBackground, { backgroundColor: colors.background }]} />
      <View
        pointerEvents="none"
        style={[styles.softOverlay, overlayStyle]}
      />
      <View pointerEvents="none" style={styles.blobLayer}>
        {shapeConfigs.map((config) => (
          <AnimatedShape key={config.id} config={config} />
        ))}
      </View>
      {animDone ? (
        <View style={styles.contentLayer}>{children}</View>
      ) : (
        <Animated.View style={[styles.contentLayer, contentAnimatedStyle]}>{children}</Animated.View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  baseBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  softOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  blobLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
  },
  contentLayer: {
    flex: 1,
  },
})
