import { useState } from 'react'
import { Button } from '#/components/ui/button'
import { Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  value: string
  label?: string
  className?: string
  variant?: 'outline' | 'secondary' | 'ghost'
  size?: 'default' | 'sm' | 'icon'
}

export function CopyButton({ value, label, className, variant = 'outline', size = 'sm' }: Props) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    copyToClipboard(value)
    setCopied(true)
    toast.success('Copied to clipboard', {
      description: value.length > 60 ? value.slice(0, 60) + '...' : value,
    })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button variant={variant} size={size} onClick={handleCopy} className={className}>
      {copied ? (
        <>
          <Check className="mr-2 h-4 w-4" />
          {label ? 'Copied!' : null}
        </>
      ) : (
        <>
          <Copy className="mr-2 h-4 w-4" />
          {label}
        </>
      )}
    </Button>
  )
}

function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text))
  } else {
    fallbackCopy(text)
  }
}

function fallbackCopy(text: string) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}
