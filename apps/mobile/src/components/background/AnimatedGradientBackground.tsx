import React, { useEffect, useMemo, useState } from 'react'
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
import Svg, { Rect } from 'react-native-svg'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

import { palette } from '@pocketdev/shared/theme'

const BAUHAUS = palette.bauhaus

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  const bigint = Number.parseInt(normalized, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

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

function NoiseOverlay({ isDark, variant }: { isDark: boolean, variant: 'connect' | 'setup' }) {
  const noiseRects = useMemo(() => {
    const count = variant === 'setup' ? 120 : 64
    const seedBase = variant === 'setup' ? 17 : 11

    return Array.from({ length: count }, (_, index) => {
      const x = ((index * 73 + seedBase * 19) % 1000) / 1000
      const y = ((index * 91 + seedBase * 13) % 1600) / 1600
      const size = index % 7 === 0 ? 2 : 1
      const opacity = variant === 'setup'
        ? (isDark ? (index % 5 === 0 ? 0.055 : 0.03) : (index % 5 === 0 ? 0.04 : 0.022))
        : (isDark ? 0.03 : 0.018)

      return {
        key: `${variant}-${index}`,
        x: Math.round(x * SCREEN_WIDTH),
        y: Math.round(y * SCREEN_HEIGHT),
        size,
        opacity,
      }
    })
  }, [isDark, variant])

  return (
    <View pointerEvents="none" style={styles.noiseLayer}>
      <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
        {noiseRects.map((rect) => (
          <Rect
            key={rect.key}
            x={rect.x}
            y={rect.y}
            width={rect.size}
            height={rect.size}
            fill={isDark ? '#ffffff' : BAUHAUS.black}
            opacity={rect.opacity}
          />
        ))}
      </Svg>
    </View>
  )
}

export default function AnimatedGradientBackground({
  colors,
  isDark,
  variant = 'connect',
  children,
}: Props) {
  const overlayStyle = {
    backgroundColor:
      variant === 'setup'
        ? (isDark ? 'rgba(10,10,10,0.88)' : 'rgba(250,248,242,0.92)')
        : (isDark ? 'rgba(10,10,10,0.72)' : 'rgba(250,250,250,0.82)'),
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

  const setupAccentColors = useMemo(() => {
    const pools = [
      [BAUHAUS.blue, BAUHAUS.red, BAUHAUS.yellow],
      [BAUHAUS.red, BAUHAUS.yellow, BAUHAUS.blue],
      [BAUHAUS.yellow, BAUHAUS.blue, BAUHAUS.red],
    ] as const

    return pools[Math.floor(Math.random() * pools.length)]
  }, [])

  const shapeConfigs: ShapeConfig[] =
    variant === 'setup'
      ? [
          {
            id: 'setup-wash-a',
            shape: 'circle',
            color: hexToRgba(setupAccentColors[0], isDark ? 0.08 : 0.07),
            width: SCREEN_WIDTH * 0.92,
            height: SCREEN_WIDTH * 0.92,
            initialX: SCREEN_WIDTH * 0.22,
            initialY: SCREEN_HEIGHT * 0.2,
            rangeX: 10,
            rangeY: 8,
            breathe: true,
            duration: 14000,
            delay: 0,
            opacity: 1,
          },
          {
            id: 'setup-wash-b',
            shape: 'circle',
            color: hexToRgba(setupAccentColors[1], isDark ? 0.06 : 0.05),
            width: SCREEN_WIDTH * 0.8,
            height: SCREEN_WIDTH * 0.8,
            initialX: SCREEN_WIDTH * 0.84,
            initialY: SCREEN_HEIGHT * 0.38,
            rangeX: 8,
            rangeY: 10,
            breathe: true,
            duration: 16000,
            delay: 600,
            opacity: 1,
          },
          {
            id: 'setup-wash-c',
            shape: 'circle',
            color: hexToRgba(setupAccentColors[2], isDark ? 0.05 : 0.045),
            width: SCREEN_WIDTH * 0.7,
            height: SCREEN_WIDTH * 0.7,
            initialX: SCREEN_WIDTH * 0.48,
            initialY: SCREEN_HEIGHT * 0.88,
            rangeX: 7,
            rangeY: 12,
            duration: 18000,
            delay: 300,
            opacity: 1,
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
      <NoiseOverlay isDark={isDark} variant={variant} />
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
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
  },
  softOverlay: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
  },
  noiseLayer: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    opacity: 0.55,
  },
  blobLayer: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
  },
  contentLayer: {
    flex: 1,
  },
})
