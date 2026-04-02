import React from 'react'
import { StyleSheet, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useTheme } from '../contexts/ThemeContext'
import AdaptiveShell from '../components/layout/AdaptiveShell'
import PlanWorkspace from '../components/plan/PlanWorkspace'
import type { RootStackParamList } from '../navigation/types'
import { usePlanStore } from '../stores/plan'

type Props = NativeStackScreenProps<RootStackParamList, 'Plan'>

export default function PlanScreen({}: Props) {
  const { colors } = useTheme()
  const refresh = usePlanStore((s) => s.refresh)

  React.useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <AdaptiveShell style={{ backgroundColor: colors.background }} maxWidth={1360}>
      <View style={styles.container}>
        <PlanWorkspace />
      </View>
    </AdaptiveShell>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})
