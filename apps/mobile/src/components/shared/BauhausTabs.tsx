import React from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import ReanimatedLib, {
  useAnimatedStyle,
  interpolate,
  interpolateColor,
  type SharedValue,
} from 'react-native-reanimated'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { typeStyles } from '../../theme/typography'

type Tab = { label: string }

type Props = {
  tabs: Tab[]
  /** Fractional scroll index (0 = first tab, 1 = second, 0.5 = halfway) */
  scrollIndex: SharedValue<number>
  onChange: (index: number) => void
}

function TabItem({
  tab,
  index,
  scrollIndex,
  onPress,
}: {
  tab: Tab
  index: number
  scrollIndex: SharedValue<number>
  onPress: () => void
}) {
  const { colors } = useTheme()

  const borderStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollIndex.value,
      [index - 1, index, index + 1],
      [0, 1, 0],
      'clamp',
    )
    return { opacity: progress }
  })

  const labelStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollIndex.value,
      [index - 1, index, index + 1],
      [0, 1, 0],
      'clamp',
    )
    return {
      color: interpolateColor(progress, [0, 1], [colors.textTertiary, colors.text]),
    }
  })

  return (
    <TouchableOpacity style={styles.tab} onPress={onPress} activeOpacity={0.7}>
      <ReanimatedLib.View
        style={[styles.border, { borderColor: colors.border }, borderStyle]}
        pointerEvents="none"
      />
      <ReanimatedLib.Text style={[styles.label, labelStyle]}>
        {tab.label}
      </ReanimatedLib.Text>
    </TouchableOpacity>
  )
}

export default function BauhausTabs({ tabs, scrollIndex, onChange }: Props) {
  const { colors } = useTheme()

  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      <View style={styles.row}>
        {tabs.map((tab, i) => (
          <TabItem
            key={tab.label}
            tab={tab}
            index={i}
            scrollIndex={scrollIndex}
            onPress={() => onChange(i)}
          />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 2,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[3],
  },
  tab: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[4],
  },
  border: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderWidth: 2,
    borderRadius: borderRadius.lg,
  },
  label: {
    ...typeStyles.sectionTitle,
  },
})
