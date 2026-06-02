'use client'

import { IntelligenceCard, type IntelligenceCardWaterBody } from './IntelligenceCard'

export type SortOption = 'signal' | 'name' | 'updated' | 'flow'

function titleCaseRegion(s: string): string {
  return s
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'signal', label: 'Signal' },
  { key: 'name', label: 'Name' },
  { key: 'updated', label: 'Updated' },
  { key: 'flow', label: 'Flow' },
]

interface IntelligencePanelProps {
  waterBodies: IntelligenceCardWaterBody[]
  region: string
  sortBy: SortOption
  onSortChange: (s: SortOption) => void
  onHover?: (id: string | null) => void
}

export function IntelligencePanel({
  waterBodies,
  region,
  sortBy,
  onSortChange,
  onHover,
}: IntelligencePanelProps) {
  return (
    <div className="flex h-full w-full flex-col bg-surface-container-low">
      <div className="p-6 pb-3">
        <p className="font-label text-xs font-bold uppercase tracking-[0.2em] text-secondary">
          Current Intelligence
        </p>
        <h2 className="mt-1 font-headline text-3xl italic text-primary">{titleCaseRegion(region)}</h2>
        <p className="mt-2 font-body text-sm leading-relaxed text-outline">
          Tactile data from local fly shops and gauges, refreshed twice daily.
        </p>
        <div
          role="radiogroup"
          aria-label="Sort water bodies"
          className="mt-4 flex flex-wrap items-center gap-1.5"
        >
          <span className="mr-1 font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
            Sort
          </span>
          {SORT_OPTIONS.map((opt) => {
            const active = sortBy === opt.key
            return (
              <button
                key={opt.key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onSortChange(opt.key)}
                className={
                  'rounded-md px-2.5 py-1 font-label text-xs font-semibold transition-colors ' +
                  (active
                    ? 'bg-primary-container text-on-primary'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high')
                }
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-8">
        {waterBodies.length === 0 ? (
          <p className="px-2 pt-2 font-body text-sm text-on-surface-variant">
            No water bodies to display.
          </p>
        ) : (
          waterBodies.map((wb) => (
            <IntelligenceCard key={wb.id} waterBody={wb} onHover={onHover} />
          ))
        )}
      </div>
    </div>
  )
}
