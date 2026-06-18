'use client'

import { Thermometer } from 'lucide-react'
import { GlassPanel } from '@/components/ui/GlassPanel'

export interface RegionConditions {
  flowTrend: string | null
  hatchVolume: string | null
  waterTempF: number | null
  locationLabel: string | null
}

interface LocalConditionsPanelProps {
  region: string
  // Server-fetched conditions, passed in as props so this panel renders as
  // crawlable HTML and no longer needs a client-side GraphQL round-trip.
  conditions: RegionConditions | null
}

const TONE_BY_VALUE: Record<string, string> = {
  Rising: 'text-secondary',
  Falling: 'text-error',
  Stable: 'text-primary',
  Heavy: 'text-secondary',
  Moderate: 'text-tertiary',
  Light: 'text-on-surface-variant',
}

function valueClass(value: string | null): string {
  if (!value) return 'text-on-surface-variant'
  return TONE_BY_VALUE[value] ?? 'text-primary'
}

export function LocalConditionsPanel({ region, conditions }: LocalConditionsPanelProps) {
  const flow = conditions?.flowTrend ?? '—'
  const hatch = conditions?.hatchVolume ?? '—'
  const tempF = conditions?.waterTempF
  const location = conditions?.locationLabel ?? region

  return (
    <GlassPanel className="absolute bottom-6 right-6 z-[400] hidden w-[260px] p-5 md:block">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-headline text-lg font-bold text-on-surface">Local Conditions</h4>
        <span className="font-label text-[10px] font-bold uppercase tracking-wider text-outline">
          {location}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="font-label text-[10px] uppercase tracking-wider text-outline">Flow Avg</p>
          <p className={`font-headline text-xl font-bold ${valueClass(conditions?.flowTrend ?? null)}`}>
            {flow}
          </p>
        </div>
        <div>
          <p className="font-label text-[10px] uppercase tracking-wider text-outline">Hatch Vol</p>
          <p className={`font-headline text-xl font-bold ${valueClass(conditions?.hatchVolume ?? null)}`}>
            {hatch}
          </p>
        </div>
        <div className="col-span-2 mt-1 flex items-center gap-2 border-t border-outline-variant/20 pt-3">
          <Thermometer className="h-4 w-4 text-tertiary" />
          <span className="font-body text-sm font-semibold text-on-surface">
            {tempF != null ? `${Math.round(tempF)}°F Water Temp` : 'Water temp unavailable'}
          </span>
        </div>
      </div>
    </GlassPanel>
  )
}
