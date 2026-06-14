import { ReportCard } from './ReportCard'

interface Report {
  id: string
  sourceName: string
  sourceUrl?: string | null
  reportDate?: string | null
  sentiment?: string | null
  conditionsSummary?: string | null
  flyPatternsMentioned: string[]
  speciesMentioned: string[]
  waterClarity?: string | null
}

export function ReportFeed({ reports }: { reports: Report[] }) {
  if (reports.length === 0) {
    return (
      <p className="font-body text-sm text-on-surface-variant">No reports yet.</p>
    )
  }

  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <ReportCard key={report.id} report={report} />
      ))}
    </div>
  )
}
