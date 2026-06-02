import type { ReactNode } from 'react'

interface GlassPanelProps {
  children: ReactNode
  className?: string
}

export function GlassPanel({ children, className }: GlassPanelProps) {
  return (
    <div
      className={
        'rounded-2xl bg-surface/85 shadow-lg ring-1 ring-outline-variant/20 backdrop-blur-[16px] ' +
        (className ?? '')
      }
    >
      {children}
    </div>
  )
}
