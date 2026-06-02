'use client'

import { gql, useQuery } from '@apollo/client'
import { ReportCard } from '@/components/reports/ReportCard'

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
  const { data, loading, error } = useQuery<ReportsResponse>(REPORTS_QUERY, {
    variables: { limit: 50, offset: 0 },
  })

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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 font-headline text-3xl italic text-primary">Fishing Reports</h1>
      {reports.length === 0 ? (
        <p className="font-body text-on-surface-variant">No reports available yet.</p>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  )
}
