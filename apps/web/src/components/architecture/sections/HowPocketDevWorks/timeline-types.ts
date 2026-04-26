import type { ReactNode } from 'react'
import type { ExplainerStageProps } from './explainers/types'

export type SceneRenderProps = {
  /** 0–1 progress through this scene's active scroll range */
  progress: number
  /** True when the scene is in its scroll range */
  active: boolean
  /** Whether the viewport is >= 1024px */
  isDesktopLayout: boolean
  /** Raw 0–1 overall scroll progress */
  railProgress: number
  /** True when the persistent overlay is rendering the laptop — scene should hide its own */
  hideLaptop?: boolean
  /** True when the persistent overlay is rendering the blue circle — scene should hide its own */
  hideBlueCircle?: boolean
  /** True when the persistent overlay is rendering the phone — scene should hide its own */
  hidePhone?: boolean
  /** True when the overlay is rendering the door — scene 3 should hide its own */
  hideDoor?: boolean
  /**
   * 0–1 preview progress driven by the previous scene's slide-out.
   * Scenes can use this to start entrance animations before they are
   * fully in view (e.g. PortSecurity door drops during the Connect→PortSecurity slide).
   * Stays at 1 once the slide completes so the effect is permanent.
   */
  doorPreviewProgress?: number
  /**
   * 0–1 opacity for assets that fade in at scene entry while the overlay cross-fades out.
   * Used by PortSecurity to smoothly reveal its laptop + phone instead of a hard pop.
   * Defaults to 1 (fully visible) when not supplied.
   */
  assetsRevealP?: number
}

export type SceneConfig = {
  id: string
  kind: 'explainer' | 'takeover'
  /** Relative scroll budget — higher = more scroll time. Default 1. */
  weight?: number
  /** Fraction of the scroll budget that is hold (stationary) vs slide. Default 0.6. */
  holdRatio?: number
  /** Extra classes on the panel wrapper div */
  panelClassName?: string
  /** ExplainerStage props — required when kind='explainer' */
  explainer?: Omit<ExplainerStageProps, 'children'>
  /** Takeover scenes in reduced-motion: wrap in full-width container */
  reducedMotionFullBleed?: boolean
  /** The scene content */
  render: (props: SceneRenderProps) => ReactNode
}

export type SceneRange = {
  /** Scroll progress where this scene starts */
  start: number
  /** Scroll progress where this scene ends */
  end: number
  /** Scroll progress where the hold phase ends and sliding begins */
  holdEnd: number
}
