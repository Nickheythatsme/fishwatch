/**
 * Clamp client-supplied numeric query args (limit / offset / days / hours).
 *
 * The GraphQL schema sets defaults, but a client can still pass arbitrary
 * values (e.g. `limit: 999999999`) that translate into very expensive Supabase
 * queries against large tables like `gauge_readings`. Every resolver that takes
 * a count- or range-style arg runs it through `clampInt` first.
 */
export function clampInt(
  value: number | null | undefined,
  fallback: number,
  max: number,
  min = 0
): number {
  if (value == null || Number.isNaN(value)) return fallback
  return Math.max(min, Math.min(Math.floor(value), max))
}

/** Per-field bounds. Defaults mirror the schema; maxes cap the blast radius. */
export const LIMITS = {
  reports: { limit: { default: 20, max: 100 }, offset: { default: 0, max: 10_000 } },
  topPicks: { limit: { default: 5, max: 50 } },
  signals: { days: { default: 30, max: 365 } },
  recentReports: { limit: { default: 10, max: 100 } },
  gaugeReadings: { hours: { default: 24, max: 720 } }, // up to 30 days
} as const
