export type ScoreTone = 'secondary' | 'tertiary' | 'error' | 'neutral'

// "Tactile Cartographer" buckets: 1-4 error, 5-7 tertiary (earth), 8-10 secondary (forest).
export function scoreToTone(
  score: number | null | undefined,
  noData = false
): ScoreTone {
  if (noData || score == null) return 'neutral'
  if (score >= 8) return 'secondary'
  if (score >= 5) return 'tertiary'
  return 'error'
}

// Saturated background for chips/bars with on-* text.
const TONE_BG: Record<ScoreTone, string> = {
  secondary: 'bg-secondary',
  tertiary: 'bg-tertiary',
  error: 'bg-error',
  neutral: 'bg-surface-container-high',
}

// Soft container background for tonal cards.
const TONE_CONTAINER_BG: Record<ScoreTone, string> = {
  secondary: 'bg-secondary-container',
  tertiary: 'bg-tertiary-fixed',
  error: 'bg-error-container',
  neutral: 'bg-surface-container-high',
}

const TONE_TEXT: Record<ScoreTone, string> = {
  secondary: 'text-secondary',
  tertiary: 'text-tertiary',
  error: 'text-error',
  neutral: 'text-on-surface-variant',
}

export function scoreToColor(score: number | null | undefined, noData = false): string {
  return TONE_BG[scoreToTone(score, noData)]
}

export function scoreToContainerColor(score: number | null | undefined, noData = false): string {
  return TONE_CONTAINER_BG[scoreToTone(score, noData)]
}

export function scoreToTextColor(score: number | null | undefined, noData = false): string {
  return TONE_TEXT[scoreToTone(score, noData)]
}

// Five-band label scale — independent of the three-tone color buckets so that
// "Excellent" and "Great" can both render as `secondary` while still reading
// differently in copy.
export function scoreToLabel(score: number): string {
  if (score >= 9) return 'Excellent'
  if (score >= 8) return 'Great'
  if (score >= 5) return 'Fair'
  if (score >= 3) return 'Poor'
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
