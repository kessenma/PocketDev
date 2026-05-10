import React from 'react'
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { ChevronDown, ChevronUp } from 'lucide-react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { typeStyles } from '../../theme/typography'

type Props = {
  label: string
  children: React.ReactNode
  defaultExpanded?: boolean
  style?: StyleProp<ViewStyle>
}

export default function Accordion({ label, children, defaultExpanded = false, style }: Props) {
  const { colors } = useTheme()
  const [expanded, setExpanded] = React.useState(defaultExpanded)

  function toggle() {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    }
    setExpanded((v) => !v)
  }

  return (
    <View style={[style]}>
      <Pressable
        style={[styles.trigger, { borderColor: colors.border, backgroundColor: colors.panel }]}
        onPress={toggle}
      >
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        {expanded
          ? <ChevronUp color={colors.textTertiary} size={15} strokeWidth={2.2} />
          : <ChevronDown color={colors.textTertiary} size={15} strokeWidth={2.2} />}
      </Pressable>
      {expanded && (
        <View style={[styles.content, { backgroundColor: colors.panelAlt, borderColor: colors.border }]}>
          {children}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: {
    ...typeStyles.meta,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  content: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 2,
  },
})
