import { isNoDataSignal } from '@/components/signals/score-utils'

export const PUBLISH_REPORT_WINDOW_DAYS = 21

export interface GatingInput {
  signal:
    | {
        compositeScore: number
        flowScore?: number | null
        sentimentScore?: number | null
        consensusScore?: number | null
      }
    | null
    | undefined
  latestReportDate: string | null | undefined
}

/**
 * Single source of truth for the data-completeness index gate (issue #68).
 *
 * Returns true when a water page has enough fresh data to index:
 *   - non-null, non-no-data current signal
 *   - at least one parsed report within PUBLISH_REPORT_WINDOW_DAYS days
 *
 * Called by both generateMetadata (per-page robots) and sitemap.ts so the
 * two never drift apart. Pure function — pass `now` in tests for determinism.
 */
export function isPublishable(input: GatingInput, now = new Date()): boolean {
  const { signal, latestReportDate } = input
  if (signal == null || isNoDataSignal(signal)) return false
  if (!latestReportDate) return false
  const parts = latestReportDate.split('-')
  if (parts.length !== 3) return false
  const reportUtc = Date.UTC(
    parseInt(parts[0], 10),
    parseInt(parts[1], 10) - 1,
    parseInt(parts[2], 10)
  )
  const nowUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return Math.floor((nowUtc - reportUtc) / (1000 * 60 * 60 * 24)) <= PUBLISH_REPORT_WINDOW_DAYS
}
