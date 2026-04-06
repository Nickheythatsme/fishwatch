export function scoreToColor(score: number): string {
  if (score >= 8) return 'bg-signal-great'
  if (score >= 6) return 'bg-signal-good'
  if (score >= 4) return 'bg-signal-fair'
  return 'bg-signal-poor'
}

export function scoreToTextColor(score: number): string {
  if (score >= 8) return 'text-signal-great'
  if (score >= 6) return 'text-signal-good'
  if (score >= 4) return 'text-signal-fair'
  return 'text-signal-poor'
}

export function scoreToLabel(score: number): string {
  if (score >= 8) return 'Great'
  if (score >= 6) return 'Good'
  if (score >= 4) return 'Fair'
  if (score >= 2) return 'Poor'
  return 'Avoid'
}

export function isNoDataSignal(
  signal: {
    compositeScore: number
    flowScore?: number | null
    sentimentScore?: number | null
    consensusScore?: number | null
  } | null | undefined
): boolean {
  if (!signal) return false
  return (
    signal.compositeScore === 5.0 &&
    signal.flowScore == null &&
    signal.sentimentScore == null &&
    signal.consensusScore == null
  )
}

export function relativeTime(dateStr: string): string {
  // Parse as YYYY-MM-DD in UTC to avoid timezone offset issues
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr

  const thenUtc = Date.UTC(
    parseInt(parts[0], 10),
    parseInt(parts[1], 10) - 1,
    parseInt(parts[2], 10)
  )
  const nowUtc = Date.UTC(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate()
  )
  const diffDays = Math.floor((nowUtc - thenUtc) / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return 'Today'
  if (diffDays === 1) return '1d ago'
  if (diffDays <= 7) return `${diffDays}d ago`
  return dateStr
}
