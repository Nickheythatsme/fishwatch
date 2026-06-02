import type { ReactNode } from 'react'

export type TagVariant = 'primary' | 'secondary' | 'tertiary' | 'error' | 'neutral'

interface TagProps {
  variant?: TagVariant
  children: ReactNode
  className?: string
}

const VARIANT_CLASSES: Record<TagVariant, string> = {
  primary: 'bg-primary-container/15 text-primary-container',
  secondary: 'bg-secondary-container text-on-secondary-container',
  tertiary: 'bg-tertiary-fixed text-tertiary',
  error: 'bg-error-container text-on-error-container',
  neutral: 'bg-surface-container-high text-on-surface-variant',
}

export function Tag({ variant = 'neutral', children, className }: TagProps) {
  return (
    <span
      className={
        'inline-flex items-center rounded-full px-2 py-0.5 font-label text-xs font-semibold uppercase tracking-wide ' +
        VARIANT_CLASSES[variant] +
        (className ? ' ' + className : '')
      }
    >
      {children}
    </span>
  )
}
