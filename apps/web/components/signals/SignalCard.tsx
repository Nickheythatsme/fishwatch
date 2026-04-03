import { SignalBadge } from './SignalBadge'

interface WaterBodyWithSignal {
  id: string
  name: string
  slug: string
  currentFlow?: number | null
  currentSignal?: {
    compositeScore: number
    summary?: string | null
    recommendedFlies: string[]
    scoreDate: string
  } | null
}

export function SignalCard({ waterBody }: { waterBody: WaterBodyWithSignal }) {
  const signal = waterBody.currentSignal

  return (
    <a
      href={`/water/${waterBody.slug}`}
      className="block rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <h3 className="font-semibold">{waterBody.name}</h3>
        {signal && <SignalBadge score={signal.compositeScore} />}
      </div>

      {signal?.summary && (
        <p className="mt-2 text-sm text-gray-600">{signal.summary}</p>
      )}

      {waterBody.currentFlow != null && (
        <p className="mt-2 text-xs text-gray-500">
          Flow: {waterBody.currentFlow.toLocaleString()} cfs
        </p>
      )}

      {signal && signal.recommendedFlies.length > 0 && (
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
