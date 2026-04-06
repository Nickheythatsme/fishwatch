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

export default function ReportsPage() {
  const { data, loading, error } = useQuery(REPORTS_QUERY, {
    variables: { limit: 50, offset: 0 },
  })

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 rounded-lg bg-gray-200" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-red-600">Failed to load reports.</p>
      </div>
    )
  }

  const reports = data?.reports ?? []

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Fishing Reports</h1>
      <div className="space-y-4">
        {reports.map((report: any) => (
          <ReportCard key={report.id} report={report} />
        ))}
        {reports.length === 0 && (
          <p className="text-gray-500">No reports available yet.</p>
        )}
      </div>
    </div>
  )
}
