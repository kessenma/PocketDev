import type { ReactNode } from 'react'

export type ExplainerLegendItem = {
  label: string
  icon: ReactNode
}

export type ExplainerRenderState = {
  active: boolean
  progress: number
}

export type ExplainerCardProps = {
  title: string
  caption: string
  legend?: ExplainerLegendItem[]
  cardClassName?: string
  stageMinHeight?: number
  stageBorderless?: boolean
  svgClassName?: string
  preserveAspectRatio?: string
  children: (state: ExplainerRenderState) => ReactNode
}
