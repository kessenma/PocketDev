import React from 'react'
import { FolderOpen, ListChecks, Plus, Server, Settings } from 'lucide-react-native'
import type { MainTabParamList } from './types'

type TabName = keyof MainTabParamList

type IconProps = {
  color: string
  size: number
  strokeWidth?: number
}

export function renderTabIcon(routeName: TabName, { color, size, strokeWidth = 2.25 }: IconProps) {
  switch (routeName) {
    case 'Tasks':
      return <ListChecks color={color} size={size} strokeWidth={strokeWidth} />
    case 'Files':
      return <FolderOpen color={color} size={size} strokeWidth={strokeWidth} />
    case 'Server':
      return <Server color={color} size={size} strokeWidth={strokeWidth} />
    case 'NewTask':
      return <Plus color={color} size={size} strokeWidth={strokeWidth} />
    case 'Settings':
      return <Settings color={color} size={size} strokeWidth={strokeWidth} />
    default:
      return <ListChecks color={color} size={size} strokeWidth={strokeWidth} />
  }
}
