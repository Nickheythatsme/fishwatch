import { deriveSourceCredits } from '@/components/reports/source-utils'

// Derivation for the per-water "data freshness / confidence" badge.
//
// The badge turns thin/stale/single-source data into an honesty feature: rather
// than hiding low-confidence signals, it labels how many distinct sources back a
// water's signal and how recent the underlying data is. All inputs are derived
// from data the per-water page already fetches (reports + gauge readings +
// signal score date) — no new backend fields.

/** Confidence tier, strongest to weakest, plus an explicit "nothing to score". */
export type FreshnessTier = 'high' | 'medium' | 'low' | 'none'

/** Tonal variant used to color the badge; mirrors a subset of `TagVariant`. */
export type FreshnessVariant = 'secondary' | 'tertiary' | 'error' | 'neutral'

/** A recent report — only the fields freshness derivation needs. */
export interface FreshnessReport {
  sourceName: string
  sourceUrl?: string | null
  reportDate: string | null
}

/** A gauge reading — only the timestamp matters for recency. */
export interface FreshnessGaugeReading {
  measuredAt: string | null
}

export interface FreshnessInputs {
  reports: readonly FreshnessReport[]
  gaugeReadings: readonly FreshnessGaugeReading[]
  /**
   * The signal's own `scoreDate`. A weaker recency signal (when scoring last
   * ran, not when data was collected) — used only as a display fallback when
   * there are no dated reports or gauge readings.
   */
  scoreDate?: string | null
  /** Override "now" for deterministic tests. Defaults to the current date. */
  now?: Date
}

export interface Freshness {
  tier: FreshnessTier
  /** Distinct report sources backing the signal. */
  sourceCount: number
  /** Freshest underlying data point as a `YYYY-MM-DD` string, or null. */
  freshestDate: string | null
  /** Whole-day age of `freshestDate`, or null when there's no dated data. */
  freshestAgeDays: number | null
  /** Short tier label, e.g. "High confidence". */
  label: string
  /** Tonal variant for the badge chip. */
  variant: FreshnessVariant
}

// Recency thresholds (whole days). Reports run ~2x/day and gauges every 2h, so a
// "fresh" water has same-or-recent-day data; a week-old freshest point is stale.
const FRESH_DAYS = 3
const AGING_DAYS = 7

const TIER_META: Record<FreshnessTier, { label: string; variant: FreshnessVariant }> = {
  high: { label: 'High confidence', variant: 'secondary' },
  medium: { label: 'Medium confidence', variant: 'tertiary' },
  low: { label: 'Low confidence', variant: 'error' },
  none: { label: 'No data yet', variant: 'neutral' },
}

/**
 * Pull the `YYYY-MM-DD` date part from either a bare date or a full ISO
 * timestamp (gauge `measuredAt` is an ISO string; report `reportDate` is a bare
 * date). Returns null for empty/unparseable values.
 */
function toDatePart(value: string | null | undefined): string | null {
  if (!value) return null
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value)
  return match ? match[1] : null
}

/**
 * Whole calendar days between a `YYYY-MM-DD` string and `now`, computed in UTC
 * to match `relativeTime` and avoid timezone drift. Negative ages (future
 * dates) clamp to 0.
 */
function daysSinceUtc(dateStr: string, now: Date): number {
  const [y, m, d] = dateStr.split('-').map((p) => parseInt(p, 10))
  const thenUtc = Date.UTC(y, m - 1, d)
  const nowUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return Math.max(0, Math.floor((nowUtc - thenUtc) / 86_400_000))
}

function deriveTier(
  sourceCount: number,
  ageDays: number | null,
  hasUnderlyingData: boolean
): FreshnessTier {
  // No reports and no gauge readings — be honest that there's nothing to score.
  if (!hasUnderlyingData) return 'none'
  // We have data but can't date it: can't vouch for freshness.
  if (ageDays == null) return 'low'
  // Multiple sources agreeing on recent data is the strongest signal.
  if (sourceCount >= 2 && ageDays <= FRESH_DAYS) return 'high'
  // A single recent source, or recent gauge-backed data, is workable.
  if (sourceCount >= 1 && ageDays <= AGING_DAYS) return 'medium'
  // Stale, or gauge-only with no shop reports: low confidence.
  return 'low'
}

/** Derive the confidence/freshness summary for a water from its current data. */
export function deriveFreshness(input: FreshnessInputs): Freshness {
  const now = input.now ?? new Date()
  const sourceCount = deriveSourceCredits(input.reports).length

  // Freshest dated point across reports and gauge readings. Both normalize to
  // `YYYY-MM-DD`, so a lexicographic max is also the chronological max.
  const dates: string[] = []
  for (const r of input.reports) {
    const d = toDatePart(r.reportDate)
    if (d) dates.push(d)
  }
  for (const g of input.gaugeReadings) {
    const d = toDatePart(g.measuredAt)
    if (d) dates.push(d)
  }
  const freshestData = dates.length > 0 ? dates.sort().at(-1)! : null

  // Fall back to the score date for *display* only when no dated data exists.
  const freshestDate = freshestData ?? toDatePart(input.scoreDate)
  const freshestAgeDays = freshestDate ? daysSinceUtc(freshestDate, now) : null

  const hasUnderlyingData = input.reports.length > 0 || input.gaugeReadings.length > 0
  const tier = deriveTier(sourceCount, freshestData ? freshestAgeDays : null, hasUnderlyingData)
  const { label, variant } = TIER_META[tier]

  return { tier, sourceCount, freshestDate, freshestAgeDays, label, variant }
}
