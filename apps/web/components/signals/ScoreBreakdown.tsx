interface Signal {
  compositeScore: number
  flowScore?: number | null
  sentimentScore?: number | null
  consensusScore?: number | null
}

function ScoreBar({ label, score }: { label: string; score: number | null | undefined }) {
  if (score == null) return null
  const pct = (score / 10) * 100

  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-sm text-gray-600">{label}</span>
      <div className="h-2 flex-1 rounded-full bg-gray-200">
        <div
          className="h-2 rounded-full bg-blue-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-sm font-medium">{score.toFixed(1)}</span>
    </div>
  )
}

export function ScoreBreakdown({ signal }: { signal: Signal }) {
  return (
    <div className="space-y-2 rounded-lg border bg-white p-4">
      <ScoreBar label="Overall" score={signal.compositeScore} />
      <ScoreBar label="Flow" score={signal.flowScore} />
      <ScoreBar label="Sentiment" score={signal.sentimentScore} />
      <ScoreBar label="Consensus" score={signal.consensusScore} />
    </div>
  )
}
