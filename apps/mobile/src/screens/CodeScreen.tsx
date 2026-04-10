import React from 'react'
import type { CompositeNavigationProp } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { CodeScreenShell } from '../components/code-screen'
import type { MainTabParamList, RootStackParamList } from '../navigation/types'

type Props = {
  navigation: CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList, 'Code'>,
    NativeStackNavigationProp<RootStackParamList>
  >
}

export default function CodeScreen({ navigation }: Props) {
  return <CodeScreenShell navigation={navigation} />
}
