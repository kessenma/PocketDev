import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react'
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native'
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated'
import { X } from 'lucide-react-native'
import { useTheme } from '../contexts/ThemeContext'
import { typeStyles } from '../theme/typography'
import { borderRadius, palette, spacing } from '@pocketdev/shared/theme'

const BAUHAUS = palette.bauhaus
const { width: SCREEN_WIDTH } = Dimensions.get('window')

export type ToastVariant = 'default' | 'destructive' | 'success' | 'error' | 'info'

export interface ToastProps {
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

interface ToastContextType {
  toast: (props: ToastProps) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastMessage extends ToastProps {
  id: string
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const toast = useCallback((props: ToastProps) => {
    const id = Date.now().toString() + Math.random().toString(36)
    const newToast: ToastMessage = {
      id,
      duration: props.duration ?? 3000,
      ...props,
    }

    setToasts((prev) => [...prev, newToast])

    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, newToast.duration)
    }
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[]
  onDismiss: (id: string) => void
}) {
  if (toasts.length === 0) return null

  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map((toast, index) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => onDismiss(toast.id)}
          index={index}
        />
      ))}
    </View>
  )
}

const ACCENT_COLORS: Record<ToastVariant, string> = {
  default: BAUHAUS.blue,
  info: BAUHAUS.blue,
  success: BAUHAUS.yellow,
  error: BAUHAUS.red,
  destructive: BAUHAUS.red,
}

function ToastItem({
  toast,
  onDismiss,
  index,
}: {
  toast: ToastMessage
  onDismiss: () => void
  index: number
}) {
  const { colors } = useTheme()
  const entrance = useSharedValue(0)
  const variant = toast.variant ?? 'default'
  const accentColor = ACCENT_COLORS[variant]

  useEffect(() => {
    entrance.value = withSpring(1, { damping: 14, stiffness: 180 })
  }, [entrance])

  const handleDismiss = useCallback(() => {
    entrance.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(onDismiss)()
    })
  }, [entrance, onDismiss])

  const animStyle = useAnimatedStyle(() => {
    const scale = interpolate(entrance.value, [0, 1], [0.88, 1])
    const opacity = interpolate(entrance.value, [0, 0.5], [0, 1], 'clamp')
    const translateY = interpolate(entrance.value, [0, 1], [-20, 0])
    return {
      opacity,
      transform: [{ scale }, { translateY }],
    }
  })

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: colors.panel,
          borderColor: variant === 'error' || variant === 'destructive'
            ? colors.accentRed
            : colors.border,
          marginTop: index > 0 ? spacing[2] : 0,
        },
        animStyle,
      ]}
    >
      {/* Accent block — matches Dialogue */}
      <View
        pointerEvents="none"
        style={[styles.accent, { backgroundColor: accentColor }]}
      />

      <View style={styles.body}>
        <View style={styles.textColumn}>
          <Text style={[typeStyles.labelStrong, { color: colors.text }]}>
            {toast.title}
          </Text>
          {toast.description ? (
            <Text style={[typeStyles.bodySmall, { color: colors.textSecondary }]}>
              {toast.description}
            </Text>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={handleDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.closeButton}
        >
          <X size={14} color={colors.textSecondary} />
        </Pressable>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: spacing[4],
    right: spacing[4],
    alignItems: 'center',
    zIndex: 9999,
  },
  card: {
    position: 'relative',
    overflow: 'visible',
    borderWidth: 2,
    borderRadius: borderRadius.xl,
    width: SCREEN_WIDTH - spacing[4] * 2,
    maxWidth: 400,
  },
  accent: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 14,
    height: 14,
    borderBottomRightRadius: 6,
    zIndex: 2,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: spacing[4],
    gap: spacing[3],
    overflow: 'hidden',
    borderRadius: borderRadius.xl,
  },
  textColumn: {
    flex: 1,
    gap: spacing[1],
  },
  closeButton: {
    padding: spacing[1],
    marginTop: 2,
  },
})
