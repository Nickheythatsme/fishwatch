import { ReportCard } from './ReportCard'

interface Report {
  id: string
  sourceName: string
  reportDate?: string | null
  sentiment?: string | null
  conditionsSummary?: string | null
  flyPatternsMentioned: string[]
  speciesMentioned: string[]
  waterClarity?: string | null
}

export function ReportFeed({ reports }: { reports: Report[] }) {
  if (reports.length === 0) {
    return <p className="text-sm text-gray-500">No reports yet.</p>
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => (
        <ReportCard key={report.id} report={report} />
      ))}
    </div>
  )
}
