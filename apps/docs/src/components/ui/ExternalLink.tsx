import { ExternalLink as ExternalLinkIcon } from 'lucide-react'
import { docsTokens } from '#/components/docs/theme'

interface ExternalLinkProps {
  href: string
  children: React.ReactNode
  className?: string
}

export function ExternalLink({ href, children, className }: ExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={className}
      style={{
        color: docsTokens.colors.primary,
        textDecoration: 'underline',
        textUnderlineOffset: '4px',
      }}
    >
      {children}
      <ExternalLinkIcon
        size={12}
        className="inline-block ml-0.5 relative"
        style={{ top: '-1px' }}
      />
    </a>
  )
}
