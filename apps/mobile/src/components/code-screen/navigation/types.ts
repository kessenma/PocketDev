import type { LucideIcon } from 'lucide-react-native'

export type CodeScreenTabProps = {
  onScroll?: (...args: any[]) => void
  onOpenProjects?: () => void
}

export type CodeSubTabOption<T extends string = string> = {
  value: T
  label: string
  icon?: LucideIcon
}
