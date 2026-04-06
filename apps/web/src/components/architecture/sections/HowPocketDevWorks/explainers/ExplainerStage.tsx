import type { CSSProperties } from 'react'
import { architectureTextStyles, architectureTokens } from '../../../shared/theme'
import { useViewportActivity } from '../../../animations/useViewportActivity'
import { EXPLAINER_VIEWBOX } from './constants'
import type { ExplainerStageProps } from './types'

export function ExplainerStage({
  title,
  caption,
  legend,
  cardClassName,
  stageMinHeight = 236,
  stageHeight,
  stageBorderless = false,
  svgClassName,
  viewBox = EXPLAINER_VIEWBOX,
  preserveAspectRatio = 'xMidYMid meet',
  children,
  activeOverride,
  progressOverride,
}: ExplainerStageProps & {
  activeOverride?: boolean
  progressOverride?: number
}) {
  const { ref, isActive, progress } = useViewportActivity<HTMLDivElement>(0.35)
  const resolvedActive = activeOverride ?? isActive
  const resolvedProgress = progressOverride ?? progress

  const legendTextStyle: CSSProperties = {
    ...architectureTextStyles.bodyText,
    fontSize: '12px',
    lineHeight: '16px',
  }

  return (
    <article
      ref={ref}
      className={['rounded-[1.5rem] p-4 sm:p-5', cardClassName].filter(Boolean).join(' ')}
      style={architectureTextStyles.surface}
    >
      <div
        className={[
          'flex items-center justify-center overflow-hidden rounded-[1.1rem] p-3 sm:p-4',
          stageBorderless ? '' : 'border',
        ].join(' ')}
        style={{
          ...architectureTextStyles.surface,
          minHeight: stageMinHeight,
          height: stageHeight,
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 34%)',
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox={viewBox}
          className={svgClassName ?? 'block h-full w-full'}
          preserveAspectRatio={preserveAspectRatio}
          aria-hidden="true"
        >
          {children({ active: resolvedActive, progress: resolvedProgress })}
        </svg>
      </div>

      <div className="mt-4">
        <h3 className="text-lg sm:text-xl" style={architectureTextStyles.cardTitle}>
          {title}
        </h3>
        <p className="mt-2 max-w-[44ch] text-sm sm:text-base" style={architectureTextStyles.bodyText}>
          {caption}
        </p>

        {legend?.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {legend.map((item) => (
              <div
                key={item.label}
                className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5"
                style={architectureTextStyles.surface}
              >
                <span className="shrink-0">{item.icon}</span>
                <span style={legendTextStyle}>{item.label}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  )
}

export function ExplainerBackdrop({ hideFrame = false }: { hideFrame?: boolean }) {
  return (
    <>
      {hideFrame ? null : (
        <rect
          x="12"
          y="12"
          width="296"
          height="176"
          rx="22"
          fill="none"
          stroke={architectureTokens.colors.border}
          strokeOpacity="0.6"
          strokeWidth="1.5"
        />
      )}
      <circle
        cx="252"
        cy="56"
        r="44"
        fill={architectureTokens.colors.yellow}
        fillOpacity="0.08"
      />
    </>
  )
}
