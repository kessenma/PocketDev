import type { ReactNode } from 'react'

export type ExplainerLegendItem = {
  label: string
  icon: ReactNode
}

export type ExplainerRenderState = {
  active: boolean
  progress: number
}

export type ExplainerStageProps = {
  title: string
  caption: string
  legend?: ExplainerLegendItem[]
  cardClassName?: string
  stageMinHeight?: number | string
  stageHeight?: number | string
  stageBorderless?: boolean
  svgClassName?: string
  viewBox?: string
  preserveAspectRatio?: string
  children: (state: ExplainerRenderState) => ReactNode
}
