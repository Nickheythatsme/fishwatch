import { scoreToLabel } from '@/components/signals/score-utils'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/** Format a YYYY-MM-DD date string as "Month D, YYYY" (e.g. "June 21, 2026"). */
export function formatDate(dateStr: string): string {
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  const y = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  const d = parseInt(parts[2], 10)
  if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr
  return `${MONTHS[m - 1]} ${d}, ${y}`
}

export interface CitableLedeInput {
  waterName: string
  /** YYYY-MM-DD date this data is current as of (scoreDate or lastUpdated). Null → "Currently". */
  asOfDate: string | null
  /** Real (non-no-data) composite score, or null — lede is omitted entirely when null. */
  score: number | null
  /** Most recent flow in cfs, or null — flow clause omitted when null. */
  flowCfs: number | null
  /** First / most prominent hatch name, or null — hatch clause omitted when null. */
  headlineHatch: string | null
  /** Number of unique source shops contributing reports — source suffix omitted when 0. */
  sourceCount: number
}

/**
 * Builds a self-contained, citable lede sentence for the water page so AI
 * crawlers and answer engines can excerpt it without losing context. Returns
 * null when there is no usable signal (score is null).
 *
 * All clauses degrade gracefully — missing data is omitted rather than
 * filled with placeholders:
 *   "As of June 21, 2026, the Lower Deschutes is fishing Great (8.2/10):
 *    flows are 4,200 cfs, Salmonfly activity, reported by 3 shops."
 */
export function buildCitableLede(input: CitableLedeInput): string | null {
  if (input.score === null) return null

  const label = scoreToLabel(input.score)
  const scoreStr = `${label} (${input.score.toFixed(1)}/10)`
  const datePart = input.asOfDate ? `As of ${formatDate(input.asOfDate)}, ` : 'Currently, '

  const details: string[] = []
  if (input.flowCfs !== null) {
    details.push(`flows are ${Math.round(input.flowCfs).toLocaleString('en-US')} cfs`)
  }
  if (input.headlineHatch) {
    details.push(`${input.headlineHatch} activity`)
  }

  let sourceSuffix = ''
  if (input.sourceCount === 1) {
    sourceSuffix = ', reported by 1 shop'
  } else if (input.sourceCount > 1) {
    sourceSuffix = `, reported by ${input.sourceCount} shops`
  }

  const core = `${datePart}the ${input.waterName} is fishing ${scoreStr}`

  if (details.length > 0) {
    return `${core}: ${details.join(', ')}${sourceSuffix}.`
  }
  return `${core}${sourceSuffix}.`
}
