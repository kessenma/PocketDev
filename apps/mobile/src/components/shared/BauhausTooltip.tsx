import React, { useRef, useState } from 'react'
import { Animated, Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'

type Direction = 'top' | 'bottom'

type Props = {
  label: string
  /** Optional list items displayed below the label (label becomes a bold header). */
  items?: string[]
  children: React.ReactNode
  direction?: Direction
}

type AnchorRect = { x: number; y: number; width: number; height: number }

const TOOLTIP_GAP = 6
const TOOLTIP_MAX_WIDTH = 230
const SCREEN_MARGIN = 10
const MAX_ITEMS = 5

export default function BauhausTooltip({ label, items, children, direction = 'top' }: Props) {
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
  const hasItems = items && items.length > 0
  const visibleItems = hasItems ? items.slice(0, MAX_ITEMS) : []
  const overflow = hasItems ? items.length - MAX_ITEMS : 0

  const tooltipPositionStyle = anchor
    ? (() => {
        const screenWidth = Dimensions.get('window').width
        const idealLeft = anchor.x + anchor.width / 2 - TOOLTIP_MAX_WIDTH / 2
        const left = Math.max(
          SCREEN_MARGIN,
          Math.min(idealLeft, screenWidth - TOOLTIP_MAX_WIDTH - SCREEN_MARGIN),
        )
        const top = direction === 'bottom'
          ? anchor.y + anchor.height + TOOLTIP_GAP
          : anchor.y - TOOLTIP_GAP - (hasItems ? 20 + visibleItems.length * 22 : 30)
        return { top, left }
      })()
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
              <Text style={[styles.tooltipText, hasItems && styles.tooltipHeader]}>{label}</Text>
              {visibleItems.map((item, i) => (
                <View key={i} style={styles.itemRow}>
                  <Text style={styles.bullet}>·</Text>
                  <Text style={styles.itemText} numberOfLines={1}>{item}</Text>
                </View>
              ))}
              {overflow > 0 && (
                <Text style={styles.overflow}>+{overflow} more</Text>
              )}
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
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    width: TOOLTIP_MAX_WIDTH,
  },
  tooltipText: {
    ...typographyScale.xs,
    fontWeight: '600',
    color: '#ffffff',
  },
  tooltipHeader: {
    fontWeight: '700',
    marginBottom: spacing[1],
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 1,
  },
  bullet: {
    ...typographyScale.xs,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 16,
  },
  itemText: {
    ...typographyScale.xs,
    color: 'rgba(255,255,255,0.85)',
    flex: 1,
  },
  overflow: {
    ...typographyScale.xs,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 2,
  },
})
