import React from 'react'
import { StyleSheet, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useTheme } from '../contexts/ThemeContext'
import AdaptiveShell from '../components/layout/AdaptiveShell'
import NewTaskForm from '../components/tasks/NewTaskForm'
import type { RootStackParamList } from '../navigation/types'

type Props = NativeStackScreenProps<RootStackParamList, 'NewTask'>

export default function NewTaskScreen({ navigation }: Props) {
  const { colors } = useTheme()

  return (
    <AdaptiveShell style={{ backgroundColor: colors.background }} maxWidth={960}>
      <View style={styles.container}>
        <NewTaskForm onSubmitted={() => navigation.goBack()} />
      </View>
    </AdaptiveShell>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})
