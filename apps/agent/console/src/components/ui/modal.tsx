import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function Modal({ open, onClose, title, description, children, className }: ModalProps) {
  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-6">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative z-10 flex h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-[2rem] border border-black bg-[linear-gradient(135deg,var(--surface-paper)_0%,var(--surface-paper)_72%,var(--bauhaus-red)_72%,var(--bauhaus-red)_100%)] text-black shadow-[0_32px_120px_rgba(0,0,0,0.45)]',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-black/15 px-5 py-4 sm:px-6">
          <div className="space-y-1">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-black/55">Focused Surface</p>
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
            {description ? (
              <p className="max-w-2xl text-sm text-black/65">{description}</p>
            ) : null}
          </div>
          <Button type="button" variant="outline" size="icon" className="border-black/15 bg-white/70 hover:bg-white" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 p-3 sm:p-5">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
