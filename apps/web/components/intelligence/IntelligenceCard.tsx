'use client'

import Link from 'next/link'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { SpeciesIcon } from '@/components/ui/SpeciesIcon'
import { isNoDataSignal, scoreToTextColor } from '@/components/signals/score-utils'

export interface IntelligenceCardWaterBody {
  id: string
  name: string
  slug: string
  typicalSpecies: string[]
  currentFlow: number | null
  currentSignal: {
    compositeScore: number
    flowScore: number | null
    sentimentScore: number | null
    consensusScore: number | null
    topSection: string | null
  } | null
}

interface IntelligenceCardProps {
  waterBody: IntelligenceCardWaterBody
  onHover?: (id: string | null) => void
}

function formatFlow(cfs: number | null): string | null {
  if (cfs == null) return null
  return `${Math.round(cfs).toLocaleString()} CFS`
}

export function IntelligenceCard({ waterBody, onHover }: IntelligenceCardProps) {
  const signal = waterBody.currentSignal
  const noData = isNoDataSignal(signal)
  const score = signal && !noData ? signal.compositeScore : null
  const section = signal?.topSection ?? null
  const sectionToneClass = scoreToTextColor(score, noData)
  const species = waterBody.typicalSpecies.slice(0, 3)
  const flowLabel = formatFlow(waterBody.currentFlow)

  return (
    <Link
      href={`/water/${waterBody.slug}`}
      onMouseEnter={() => onHover?.(waterBody.id)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(waterBody.id)}
      onBlur={() => onHover?.(null)}
      className="block rounded-2xl bg-surface-container-lowest p-5 transition-colors hover:bg-surface-container focus:bg-surface-container focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-headline text-xl font-bold text-on-surface">
            {waterBody.name}
          </h3>
          {section && (
            <p
              className={`mt-0.5 font-label text-xs font-bold uppercase tracking-wider ${sectionToneClass}`}
            >
              {section}
            </p>
          )}
        </div>
        <ScoreRing score={score} noData={noData} size="md" />
      </div>
      <div className="flex items-center gap-3">
        {species.length > 0 && (
          <div className="flex -space-x-1">
            {species.map((s) => (
              <SpeciesIcon key={s} name={s} />
            ))}
          </div>
        )}
        {species.length > 0 && flowLabel && (
          <span className="h-4 w-px bg-outline-variant/30" />
        )}
        {flowLabel && (
          <span className="font-body text-xs text-on-surface-variant">{flowLabel}</span>
        )}
      </div>
    </Link>
  )
}
