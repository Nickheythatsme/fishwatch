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
      <span className="w-32 font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
        {label}
      </span>
      <div className="h-2 flex-1 rounded-full bg-surface-container-high">
        <div
          className={`h-2 rounded-full ${scoreToColor(score)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-20 text-right font-body text-sm font-semibold text-on-surface">
        {score.toFixed(1)}
        {showLabel && (
          <span className="ml-1 font-label text-xs font-normal text-on-surface-variant">
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
      <div className="rounded-2xl bg-surface-container-lowest p-5 text-center font-body text-sm text-on-surface-variant">
        No signal data available for this water body.
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-2xl bg-surface-container-lowest p-5">
      <ScoreBar label="Overall Signal" score={signal.compositeScore} showLabel />
      <ScoreBar label="River Flow" score={signal.flowScore} />
      <ScoreBar label="Shop Reports" score={signal.sentimentScore} />
      <ScoreBar label="Report Agreement" score={signal.consensusScore} />
    </div>
  )
}
