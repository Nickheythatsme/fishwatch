'use client'

import { Suspense } from 'react'
import { gql, useQuery } from '@apollo/client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ReportCard } from '@/components/reports/ReportCard'
import {
  activeFilterCount,
  matchesReportFilters,
  parseReportFilters,
  serializeReportFilters,
} from '@/components/reports/filters'

const REPORTS_QUERY = gql`
  query Reports($limit: Int, $offset: Int) {
    reports(limit: $limit, offset: $offset) {
      id
      sourceName
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

export default function ReportsPage() {
  return (
    <Suspense>
      <ReportsContent />
    </Suspense>
  )
}

function ReportsContent() {
  const { data, loading, error } = useQuery<ReportsResponse>(REPORTS_QUERY, {
    variables: { limit: 100, offset: 0 },
  })

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const filters = parseReportFilters(new URLSearchParams(searchParams.toString()))
  const hasFilters = activeFilterCount(filters) > 0

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 h-9 w-64 animate-pulse rounded-md bg-surface-container-high" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl bg-surface-container-high"
            />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="rounded-2xl bg-error-container/30 p-6 text-error">
          Failed to load reports.
        </p>
      </div>
    )
  }

  const reports = data?.reports ?? []
  const visible = reports.filter((report) => matchesReportFilters(report, filters))

  function clearFilters() {
    const qs = serializeReportFilters(new URLSearchParams(searchParams.toString()), {
      sources: [],
      species: [],
    })
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 font-headline text-3xl italic text-primary">Fishing Reports</h1>
      {reports.length === 0 ? (
        <p className="font-body text-on-surface-variant">No reports available yet.</p>
      ) : visible.length === 0 ? (
        <div className="font-body text-on-surface-variant">
          <p>No reports match your filters.</p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-2 font-label text-sm font-semibold text-primary hover:underline"
          >
            Clear filters
          </button>
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
