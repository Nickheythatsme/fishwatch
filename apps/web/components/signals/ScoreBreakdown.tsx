import { scoreToColor, scoreToLabel } from './score-utils'

interface Signal {
  compositeScore: number
  flowScore?: number | null
  sentimentScore?: number | null
  consensusScore?: number | null
}

function ScoreBar({
  label,
  score,
  showLabel,
}: {
  label: string
  score: number | null | undefined
  showLabel?: boolean
}) {
  if (score == null) return null
  const pct = (score / 10) * 100

  return (
    <div className="flex items-center gap-3">
      <span className="w-28 text-sm text-gray-600">{label}</span>
      <div className="h-2 flex-1 rounded-full bg-gray-200">
        <div
          className={`h-2 rounded-full ${scoreToColor(score)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-16 text-right text-sm font-medium">
        {score.toFixed(1)}
        {showLabel && (
          <span className="ml-1 text-xs font-normal text-gray-400">
            {scoreToLabel(score)}
          </span>
        )}
      </span>
    </div>
  )
}

export function ScoreBreakdown({ signal, noData }: { signal: Signal; noData?: boolean }) {
  if (noData) {
    return (
      <div className="rounded-lg border bg-white p-4 text-center text-sm text-gray-400">
        No signal data available for this water body.
      </div>
    )
  }

  return (
    <div className="space-y-2 rounded-lg border bg-white p-4">
      <ScoreBar label="Overall Signal" score={signal.compositeScore} showLabel />
      <ScoreBar label="River Flow" score={signal.flowScore} />
      <ScoreBar label="Shop Reports" score={signal.sentimentScore} />
      <ScoreBar label="Report Agreement" score={signal.consensusScore} />
    </div>
  )
}
