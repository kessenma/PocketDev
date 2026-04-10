import React from 'react'
import type { Animated } from 'react-native'
import type { GitView } from './model'
import CodeSubTabNavigator from '../code-screen/navigation/CodeSubTabNavigator'

type Option = {
  value: GitView
  label: string
  icon?: any
}

type Props = {
  value: GitView
  options: readonly Option[]
  onChange: (value: GitView) => void
  /** Animated value 0..1 where 1 = fully compact (icons only circles) */
  compact?: Animated.AnimatedInterpolation<number>
}

export default function GitSegmentedControl({ value, options, onChange, compact }: Props) {
  return <CodeSubTabNavigator value={value} options={options} onChange={onChange} compact={compact} />
}
