import React from 'react'
import type { SharedValue } from 'react-native-reanimated'
import type { GitView } from '../model'
import CodeSubTabNavigator from '../../code-screen/navigation/CodeSubTabNavigator'

type Option = {
  value: GitView
  label: string
  icon?: any
}

type Props = {
  value: GitView
  options: readonly Option[]
  onChange: (value: GitView) => void
  /** SharedValue 0..1 where 1 = fully compact (icons only) */
  compact?: SharedValue<number>
}

export default function GitSegmentedControl({ value, options, onChange, compact }: Props) {
  return <CodeSubTabNavigator value={value} options={options} onChange={onChange} compact={compact} />
}
