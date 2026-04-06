'use client'

import { SignalBadge } from './SignalBadge'
import { isNoDataSignal, relativeTime } from './score-utils'

interface WaterBodyWithSignal {
  id: string
  name: string
  slug: string
  currentFlow?: number | null
  currentSignal?: {
    compositeScore: number
    flowScore?: number | null
    sentimentScore?: number | null
    consensusScore?: number | null
    summary?: string | null
    recommendedFlies: string[]
    scoreDate: string
  } | null
}

interface SignalCardProps {
  waterBody: WaterBodyWithSignal
  onHover?: (id: string | null) => void
}

export function SignalCard({ waterBody, onHover }: SignalCardProps) {
  const signal = waterBody.currentSignal
  const noData = isNoDataSignal(signal)

  return (
    <a
      href={`/water/${waterBody.slug}`}
      className="block rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
      onMouseEnter={() => onHover?.(waterBody.id)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(waterBody.id)}
      onBlur={() => onHover?.(null)}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold">{waterBody.name}</h3>
          {signal && !noData && (
            <span className="text-xs text-gray-400">
              Updated {relativeTime(signal.scoreDate)}
            </span>
          )}
        </div>
        {signal && <SignalBadge score={signal.compositeScore} noData={noData} />}
      </div>

      {!noData && waterBody.currentFlow != null && (
        <p className="mt-2 text-xs text-gray-500">
          Flow: {waterBody.currentFlow.toLocaleString()} cfs
        </p>
      )}

      {!noData && signal && signal.recommendedFlies.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {signal.recommendedFlies.slice(0, 3).map((fly) => (
            <span
              key={fly}
              className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800"
            >
              {fly}
            </span>
          ))}
        </div>
      )}

      {!signal && (
        <p className="mt-2 text-sm text-gray-400">No signal data yet</p>
      )}
    </a>
  )
}
