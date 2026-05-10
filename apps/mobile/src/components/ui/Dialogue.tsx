import React, { type ReactNode, useEffect } from 'react'
import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { borderRadius, palette, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { typeStyles } from '../../theme/typography'

const BAUHAUS = palette.bauhaus

type DialogueVariant = 'default' | 'alert' | 'error'

type DialogueAction = {
  label: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'danger'
}

type Props = {
  visible: boolean
  title: string
  children?: ReactNode
  description?: string
  actions?: DialogueAction[]
  variant?: DialogueVariant
  onClose: () => void
}

const ACCENT_COLORS: Record<DialogueVariant, string> = {
  default: BAUHAUS.yellow,
  alert: BAUHAUS.red,
  error: BAUHAUS.red,
}

export default function Dialogue({
  visible,
  title,
  children,
  description,
  actions,
  variant = 'default',
  onClose,
}: Props) {
  const { colors } = useTheme()
  const accentColor = ACCENT_COLORS[variant]

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {visible && (
          <>
            {/* Full-screen particle layer — behind the card, fills the viewport */}
            {variant !== 'default' && (
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                {PARTICLES.map((p, i) => (
                  <Particle key={i} config={p} variant={variant} />
                ))}
              </View>
            )}

            <DialogueCard
              variant={variant}
              accentColor={accentColor}
              colors={colors}
              title={title}
              description={description}
              actions={actions}
              onClose={onClose}
            >
              {children}
            </DialogueCard>
          </>
        )}
      </Pressable>
    </Modal>
  )
}

/* ─── animated card ─── */

type CardProps = {
  variant: DialogueVariant
  accentColor: string
  colors: ReturnType<typeof useTheme>['colors']
  title: string
  description?: string
  actions?: DialogueAction[]
  children?: ReactNode
  onClose: () => void
}

function DialogueCard({
  variant,
  accentColor,
  colors,
  title,
  description,
  actions,
  children,
  onClose,
}: CardProps) {
  const entrance = useSharedValue(0)
  const shake = useSharedValue(0)

  useEffect(() => {
    entrance.value = withSpring(1, { damping: 14, stiffness: 180 })

    if (variant === 'error') {
      shake.value = withSequence(
        withDelay(80, withTiming(1, { duration: 60 })),
        withTiming(-1, { duration: 60 }),
        withTiming(0.7, { duration: 50 }),
        withTiming(-0.5, { duration: 50 }),
        withTiming(0, { duration: 60 }),
      )
    }
  }, [entrance, shake, variant])

  const cardAnimStyle = useAnimatedStyle(() => {
    const scale = interpolate(entrance.value, [0, 1], [0.88, 1])
    const opacity = interpolate(entrance.value, [0, 0.5], [0, 1], 'clamp')
    const shakeX = shake.value * 8
    return {
      opacity,
      transform: [{ scale }, { translateX: shakeX }],
    }
  })

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: colors.panel,
          borderColor: variant === 'error' ? colors.accentRed : colors.border,
        },
        cardAnimStyle,
      ]}
    >
      {/* Accent block */}
      <View pointerEvents="none" style={[styles.accent, { backgroundColor: accentColor }]} />

      <Pressable style={styles.body} onPress={(e) => e.stopPropagation()}>
        <Text style={[typeStyles.screenTitle, { color: colors.text }]}>{title}</Text>

        {description ? (
          <Text style={[typeStyles.body, { color: colors.textSecondary }]}>{description}</Text>
        ) : null}

        {children}

        {actions && actions.length > 0 ? (
          <View style={styles.actions}>
            {actions.map((action) => {
              const pal = getActionPalette(action.variant ?? 'primary', colors)
              return (
                <Pressable
                  key={action.label}
                  accessibilityRole="button"
                  onPress={action.onPress}
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: pal.bg,
                      borderColor: pal.border,
                      flex: actions.length > 1 ? 1 : undefined,
                    },
                  ]}
                >
                  <Text style={[typeStyles.button, { color: pal.text }]}>{action.label}</Text>
                </Pressable>
              )
            })}
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={[styles.actionButton, { backgroundColor: colors.primary, borderColor: colors.border }]}
          >
            <Text style={[typeStyles.button, { color: colors.primaryText }]}>OK</Text>
          </Pressable>
        )}
      </Pressable>
    </Animated.View>
  )
}

/* ─── particles ─── */

// Particles are positioned in absolute screen-space (px from viewport center).
// Travel distances are proportional to screen size so they fly edge-to-edge.

type ParticleConfig = {
  // Start position as fraction of screen half-width / half-height from center
  xFrac: number
  yFrac: number
  // Travel as fraction of screen half-dimension
  dxFrac: number
  dyFrac: number
  size: number
  rotation: number
  delay: number
  shape: 'square' | 'bar'
  colorKey: 'red' | 'blue' | 'yellow' | 'black'
}

const PARTICLES: ParticleConfig[] = [
  // ── alert: red squares bursting from card edges toward screen edges ──
  // Top-left cluster
  { xFrac: -0.20, yFrac: -0.08, dxFrac: -0.55, dyFrac: -0.38, size: 14, rotation: 35, delay: 0, shape: 'square', colorKey: 'red' },
  { xFrac: -0.12, yFrac: -0.12, dxFrac: -0.40, dyFrac: -0.50, size: 10, rotation: -20, delay: 80, shape: 'bar', colorKey: 'red' },
  // Top-right
  { xFrac: 0.22, yFrac: -0.10, dxFrac: 0.50, dyFrac: -0.42, size: 12, rotation: -28, delay: 40, shape: 'square', colorKey: 'red' },
  { xFrac: 0.14, yFrac: -0.14, dxFrac: 0.35, dyFrac: -0.55, size: 8, rotation: 45, delay: 120, shape: 'bar', colorKey: 'yellow' },
  // Bottom-left
  { xFrac: -0.24, yFrac: 0.10, dxFrac: -0.52, dyFrac: 0.40, size: 11, rotation: 50, delay: 60, shape: 'square', colorKey: 'red' },
  { xFrac: -0.08, yFrac: 0.14, dxFrac: -0.30, dyFrac: 0.48, size: 7, rotation: -38, delay: 160, shape: 'square', colorKey: 'yellow' },
  // Bottom-right
  { xFrac: 0.20, yFrac: 0.12, dxFrac: 0.48, dyFrac: 0.44, size: 13, rotation: -18, delay: 30, shape: 'square', colorKey: 'red' },
  { xFrac: 0.10, yFrac: 0.06, dxFrac: 0.56, dyFrac: 0.20, size: 9, rotation: 32, delay: 100, shape: 'bar', colorKey: 'yellow' },
  // Straight out sides
  { xFrac: -0.28, yFrac: 0.02, dxFrac: -0.60, dyFrac: -0.06, size: 10, rotation: -42, delay: 90, shape: 'square', colorKey: 'red' },
  { xFrac: 0.28, yFrac: -0.02, dxFrac: 0.58, dyFrac: 0.08, size: 10, rotation: 22, delay: 70, shape: 'square', colorKey: 'red' },

  // ── error-only: dark fragments ──
  { xFrac: -0.16, yFrac: -0.06, dxFrac: -0.48, dyFrac: -0.32, size: 8, rotation: -55, delay: 20, shape: 'square', colorKey: 'black' },
  { xFrac: 0.18, yFrac: 0.08, dxFrac: 0.44, dyFrac: 0.36, size: 7, rotation: 40, delay: 110, shape: 'bar', colorKey: 'black' },
  { xFrac: 0.04, yFrac: -0.16, dxFrac: 0.12, dyFrac: -0.58, size: 6, rotation: -30, delay: 50, shape: 'square', colorKey: 'black' },
  { xFrac: -0.06, yFrac: 0.16, dxFrac: -0.14, dyFrac: 0.54, size: 6, rotation: 62, delay: 140, shape: 'bar', colorKey: 'black' },
]

const PARTICLE_COLOR_MAP: Record<string, string> = {
  red: BAUHAUS.red,
  blue: BAUHAUS.blue,
  yellow: BAUHAUS.yellow,
  black: BAUHAUS.black,
}

function Particle({ config, variant }: { config: ParticleConfig; variant: DialogueVariant }) {
  const progress = useSharedValue(0)

  // Only show error-exclusive particles (black) for the error variant
  const isErrorOnly = config.colorKey === 'black'
  if (isErrorOnly && variant !== 'error') return null

  const { width: screenW, height: screenH } = Dimensions.get('window')
  const halfW = screenW / 2
  const halfH = screenH / 2

  // Convert fractional positions to absolute px from center
  const startX = halfW + config.xFrac * halfW
  const startY = halfH + config.yFrac * halfH
  const travelX = config.dxFrac * halfW
  const travelY = config.dyFrac * halfH

  useEffect(() => {
    progress.value = withDelay(
      config.delay,
      withSequence(
        withTiming(1, { duration: 560, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 380, easing: Easing.in(Easing.quad) }),
      ),
    )
  }, [config.delay, progress])

  const animStyle = useAnimatedStyle(() => {
    const t = progress.value
    return {
      opacity: interpolate(t, [0, 0.15, 0.6, 1], [0, 0.95, 0.85, 0]),
      transform: [
        { translateX: travelX * t },
        { translateY: travelY * t },
        { rotate: `${config.rotation * t}deg` },
        { scale: interpolate(t, [0, 0.25, 1], [0.3, 1.15, 0.5]) },
      ],
    }
  })

  const color = PARTICLE_COLOR_MAP[config.colorKey]
  const isBar = config.shape === 'bar'

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: startX,
          top: startY,
          width: isBar ? config.size * 3.5 : config.size,
          height: isBar ? config.size : config.size,
          borderRadius: isBar ? 999 : 2,
          backgroundColor: color,
        },
        animStyle,
      ]}
    />
  )
}

/* ─── helpers ─── */

function getActionPalette(variant: 'primary' | 'secondary' | 'danger', colors: ReturnType<typeof useTheme>['colors']) {
  switch (variant) {
    case 'secondary':
      return { bg: colors.panelAlt, border: colors.border, text: colors.text }
    case 'danger':
      return { bg: colors.accentRed, border: colors.border, text: colors.primaryText }
    default:
      return { bg: colors.primary, border: colors.border, text: colors.primaryText }
  }
}

/* ─── styles ─── */

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  card: {
    position: 'relative',
    overflow: 'visible',
    borderWidth: 2,
    borderRadius: borderRadius.xl,
    width: '100%',
    maxWidth: 360,
  },
  accent: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 18,
    height: 18,
    borderBottomRightRadius: 6,
    zIndex: 2,
  },
  body: {
    padding: spacing[5],
    gap: spacing[3],
    overflow: 'hidden',
    borderRadius: borderRadius.xl,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  actionButton: {
    minHeight: 44,
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    justifyContent: 'center',
    alignItems: 'center',
  },
})
