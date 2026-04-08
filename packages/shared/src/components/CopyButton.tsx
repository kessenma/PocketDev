import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'

type CopyButtonVariant = 'outline' | 'secondary' | 'ghost'
type CopyButtonSize = 'default' | 'sm' | 'icon'

export interface CopyButtonProps {
  value: string
  label?: string
  copiedLabel?: string
  className?: string
  variant?: CopyButtonVariant
  size?: CopyButtonSize
  title?: string
  disabled?: boolean
  onCopied?: (value: string) => void
}

const baseClassName =
  'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-black/15 disabled:pointer-events-none disabled:opacity-50'

const variantClassNames: Record<CopyButtonVariant, string> = {
  outline: 'border-black/10 bg-white/70 text-black hover:bg-white',
  secondary: 'border-transparent bg-black text-white hover:bg-black/85',
  ghost: 'border-transparent bg-transparent text-current hover:bg-black/5',
}

const sizeClassNames: Record<CopyButtonSize, string> = {
  default: 'h-9 px-3',
  sm: 'h-8 px-2.5 text-[0.8rem]',
  icon: 'size-8',
}

export function CopyButton({
  value,
  label,
  copiedLabel = 'Copied!',
  className,
  variant = 'outline',
  size = 'sm',
  title = 'Copy to clipboard',
  disabled = false,
  onCopied,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timeoutId = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timeoutId)
  }, [copied])

  async function handleCopy() {
    await copyToClipboard(value)
    setCopied(true)
    onCopied?.(value)
  }

  const showLabel = Boolean(label)

  return (
    <button
      type="button"
      onClick={() => {
        void handleCopy()
      }}
      className={cx(
        baseClassName,
        variantClassNames[variant],
        sizeClassNames[size],
        className,
      )}
      title={title}
      aria-label={label ?? title}
      disabled={disabled}
    >
      {copied ? (
        <Check className={showLabel ? 'h-4 w-4' : 'h-4 w-4'} />
      ) : (
        <Copy className={showLabel ? 'h-4 w-4' : 'h-4 w-4'} />
      )}
      {showLabel ? <span>{copied ? copiedLabel : label}</span> : null}
    </button>
  )
}

async function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      fallbackCopy(text)
      return
    }
  }

  fallbackCopy(text)
}

function fallbackCopy(text: string) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

function cx(...values: Array<string | undefined | null | false>) {
  return values.filter(Boolean).join(' ')
}
