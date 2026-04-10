import React, { useRef, useState } from 'react'
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'

type Direction = 'top' | 'bottom'

type Props = {
  label: string
  children: React.ReactNode
  direction?: Direction
}

type AnchorRect = { x: number; y: number; width: number; height: number }

const TOOLTIP_GAP = 6

export default function BauhausTooltip({ label, children, direction = 'top' }: Props) {
  const { colors, isDark } = useTheme()
  const [visible, setVisible] = useState(false)
  const [anchor, setAnchor] = useState<AnchorRect | null>(null)
  const opacity = useRef(new Animated.Value(0)).current
  const triggerRef = useRef<View>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height })
      setVisible(true)
      Animated.timing(opacity, { toValue: 1, duration: 140, useNativeDriver: true }).start()
      if (hideTimer.current) clearTimeout(hideTimer.current)
      hideTimer.current = setTimeout(hide, 2400)
    })
  }

  const hide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    Animated.timing(opacity, { toValue: 0, duration: 140, useNativeDriver: true }).start(() =>
      setVisible(false),
    )
  }

  const tooltipBg = isDark ? 'rgba(28, 28, 30, 0.97)' : 'rgba(20, 20, 20, 0.92)'

  const tooltipPositionStyle = anchor
    ? direction === 'bottom'
      ? { top: anchor.y + anchor.height + TOOLTIP_GAP, right: undefined, left: anchor.x + anchor.width / 2 - 40 }
      : { top: anchor.y - 32 - TOOLTIP_GAP, right: undefined, left: anchor.x + anchor.width / 2 - 40 }
    : { top: 0, left: 0 }

  return (
    <View ref={triggerRef} collapsable={false}>
      <TouchableOpacity onPress={show} activeOpacity={0.7}>
        {children}
      </TouchableOpacity>
      {visible && (
        <Modal transparent visible animationType="none" onRequestClose={hide}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={hide} activeOpacity={1}>
            <Animated.View
              style={[
                styles.tooltip,
                tooltipPositionStyle,
                { opacity, backgroundColor: tooltipBg, borderColor: colors.border },
              ]}
            >
              <Text style={styles.tooltipText}>{label}</Text>
            </Animated.View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  tooltip: {
    position: 'absolute',
    zIndex: 9999,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing[2],
    paddingVertical: 5,
    minWidth: 64,
    alignItems: 'center',
  },
  tooltipText: {
    ...typographyScale.xs,
    fontWeight: '600',
    color: '#ffffff',
  },
})
