import React from 'react'
import { StyleSheet, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useTheme } from '../contexts/ThemeContext'
import AdaptiveShell from '../components/layout/AdaptiveShell'
import ContainerWorkspace from '../components/containers/ContainerWorkspace'
import type { RootStackParamList } from '../navigation/types'
import { useContainerStore } from '../stores/containers'

type Props = NativeStackScreenProps<RootStackParamList, 'Containers'>

export default function ContainersScreen({}: Props) {
  const { colors } = useTheme()
  const refreshContainers = useContainerStore((state) => state.refreshContainers)

  React.useEffect(() => {
    refreshContainers()
  }, [refreshContainers])

  return (
    <AdaptiveShell style={{ backgroundColor: colors.background }} maxWidth={1360}>
      <View style={styles.container}>
        <ContainerWorkspace />
      </View>
    </AdaptiveShell>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})