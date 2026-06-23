import type { Metadata } from 'next'
import Link from 'next/link'
import { ssrQuery } from '@/lib/graphql/execute'
import { ReportCard } from '@/components/reports/ReportCard'
import { SITE_URL } from '@/lib/seo/metadata'
import {
  activeFilterCount,
  matchesReportFilters,
  parseReportFilters,
} from '@/components/reports/filters'

// Keep the indexed report feed fresh on the same 30-minute cadence as the rest
// of the server-rendered pages.
export const revalidate = 1800

// Self-referencing canonical so the report feed isn't flagged as a duplicate
// (see issue #115).
export const metadata: Metadata = {
  alternates: { canonical: `${SITE_URL}/reports` },
}

const REPORTS_QUERY = /* GraphQL */ `
  query Reports($limit: Int, $offset: Int) {
    reports(limit: $limit, offset: $offset) {
      id
      sourceName
      sourceUrl
      reportDate
      sentiment
      conditionsSummary
      flyPatternsMentioned
      speciesMentioned
      waterClarity
      flowCommentary
      waterBody {
        name
        slug
      }
    }
  }
`

interface ReportListItem {
  id: string
  sourceName: string
  sourceUrl?: string | null
  reportDate?: string | null
  sentiment?: string | null
  conditionsSummary?: string | null
  flyPatternsMentioned: string[]
  speciesMentioned: string[]
  waterClarity?: string | null
  flowCommentary?: string | null
  waterBody?: { name: string; slug: string } | null
}

interface ReportsResponse {
  reports: ReportListItem[]
}

// Next 16 hands `searchParams` to the page as a Promise of a plain map; the
// filter helpers operate on a `URLSearchParams`, so adapt between the two.
function toSearchParams(
  sp: Record<string, string | string[] | undefined>
): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(sp)) {
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, v)
    } else if (value != null) {
      params.set(key, value)
    }
  }
  return params
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  // Filters come from the URL so a filtered feed is crawlable and shareable;
  // `ReportFilters` (a client island in the TopBar) is what writes them back.
  const filters = parseReportFilters(toSearchParams(sp))
  const hasFilters = activeFilterCount(filters) > 0

  let reports: ReportListItem[]
  try {
    const data = await ssrQuery<ReportsResponse>(REPORTS_QUERY, { limit: 100, offset: 0 })
    reports = data.reports
  } catch {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="rounded-2xl bg-error-container/30 p-6 text-error">
          Failed to load reports.
        </p>
      </div>
    )
  }

  // Source/species filtering is applied server-side so the rendered HTML already
  // reflects the active filters. (The `reports` query only filters by a single
  // source, so multi-select matching stays in `matchesReportFilters`.)
  const visible = reports.filter((report) => matchesReportFilters(report, filters))

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 font-headline text-3xl italic text-primary">Fishing Reports</h1>
      {reports.length === 0 ? (
        <p className="font-body text-on-surface-variant">No reports available yet.</p>
      ) : visible.length === 0 ? (
        <div className="font-body text-on-surface-variant">
          <p>No reports match your filters.</p>
          <Link
            href="/reports"
            className="mt-2 inline-block font-label text-sm font-semibold text-primary hover:underline"
          >
            Clear filters
          </Link>
        </div>
      ) : (
        <>
          {hasFilters && (
            <p className="mb-4 font-label text-xs text-on-surface-variant">
              Showing {visible.length} of {reports.length} reports
            </p>
          )}
          <div className="space-y-4">
            {visible.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
