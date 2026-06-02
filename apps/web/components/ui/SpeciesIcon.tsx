import { getSpeciesIcon } from '@/components/ui/icons'

interface SpeciesIconProps {
  name: string
  size?: 'sm' | 'md'
  className?: string
}

const SIZES = {
  sm: { box: 'h-7 w-7', icon: 'h-4 w-4' },
  md: { box: 'h-8 w-8', icon: 'h-4 w-4' },
} as const

export function SpeciesIcon({ name, size = 'md', className }: SpeciesIconProps) {
  const Icon = getSpeciesIcon(name)
  const { box, icon } = SIZES[size]
  return (
    <span
      title={name}
      aria-label={name}
      className={
        'inline-flex items-center justify-center rounded-md bg-surface-container-high ' +
        box +
        (className ? ' ' + className : '')
      }
    >
      <Icon className={icon + ' text-primary-container'} strokeWidth={1.75} />
    </span>
  )
}
