import { cn } from '#/lib/utils'
import type { ReactNode } from 'react'

export type StatusBadgeColor = 'green' | 'red' | 'orange' | 'yellow' | 'blue' | 'purple' | 'brand' | 'neutral'
export type StatusBadgeIconPosition = 'left' | 'right' | 'top' | 'bottom'

const colorTokens: Record<StatusBadgeColor, string> = {
  green:   'border-green-500/60  bg-green-950/85  text-green-400',
  red:     'border-red-500/60    bg-red-950/85    text-red-400',
  orange:  'border-orange-500/60 bg-orange-950/85 text-orange-400',
  yellow:  'border-yellow-500/60 bg-yellow-950/85 text-yellow-400',
  blue:    'border-blue-500/60   bg-blue-950/85   text-blue-400',
  purple:  'border-purple-500/60 bg-purple-950/85 text-purple-400',
  brand:   'border-[var(--bauhaus-yellow)]/50 bg-[var(--bauhaus-yellow)]/20 text-[var(--bauhaus-yellow)]',
  neutral: 'border-border/50     bg-black/60      text-foreground/75',
}

interface Props {
  color?: StatusBadgeColor
  icon?: ReactNode
  iconPosition?: StatusBadgeIconPosition
  children: ReactNode
  className?: string
}

export function StatusBadge({
  color = 'neutral',
  icon,
  iconPosition = 'left',
  children,
  className,
}: Props) {
  const isVertical = iconPosition === 'top' || iconPosition === 'bottom'

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-1 overflow-hidden rounded-[var(--radius-md)] border-2 px-2.5 py-0.5',
        'font-heading text-[0.62rem] font-semibold uppercase tracking-[0.18em] whitespace-nowrap',
        '[&>svg]:size-3! [&>svg]:pointer-events-none',
        isVertical ? 'flex-col' : 'flex-row',
        iconPosition === 'right' && 'flex-row-reverse',
        iconPosition === 'bottom' && 'flex-col-reverse',
        colorTokens[color],
        className,
      )}
    >
      {icon}
      <span>{children}</span>
    </span>
  )
}
