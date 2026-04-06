import { scoreToColor, scoreToLabel, scoreToTextColor } from './score-utils'

interface SignalBadgeProps {
  score: number
  noData?: boolean
}

export function SignalBadge({ score, noData }: SignalBadgeProps) {
  if (noData) {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
          Fishing Signal
        </span>
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-300 text-sm font-bold text-white">
          --
        </span>
        <span className="text-xs font-semibold text-gray-400">No Data</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
        Fishing Signal
      </span>
      <span
        className={`inline-flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white ${scoreToColor(score)}`}
      >
        {score.toFixed(1)}
      </span>
      <span className={`text-xs font-semibold ${scoreToTextColor(score)}`}>
        {scoreToLabel(score)}
      </span>
    </div>
  )
}
