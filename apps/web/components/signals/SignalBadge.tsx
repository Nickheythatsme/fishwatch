function scoreToColor(score: number): string {
  if (score >= 8) return 'bg-green-500'
  if (score >= 6) return 'bg-yellow-500'
  if (score >= 4) return 'bg-orange-500'
  return 'bg-red-500'
}

export function SignalBadge({ score }: { score: number }) {
  return (
    <span
      className={`inline-flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white ${scoreToColor(score)}`}
    >
      {score.toFixed(1)}
    </span>
  )
}
