interface Report {
  id: string
  sourceName: string
  reportDate?: string | null
  sentiment?: string | null
  conditionsSummary?: string | null
  flyPatternsMentioned: string[]
  speciesMentioned: string[]
  waterClarity?: string | null
  flowCommentary?: string | null
  waterBody?: {
    name: string
    slug: string
  } | null
}

const sentimentColors: Record<string, string> = {
  excellent: 'bg-green-100 text-green-800',
  good: 'bg-emerald-100 text-emerald-800',
  fair: 'bg-yellow-100 text-yellow-800',
  poor: 'bg-orange-100 text-orange-800',
  off: 'bg-red-100 text-red-800',
}

function formatSource(name: string): string {
  return name
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function ReportCard({ report }: { report: Report }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-sm font-medium text-gray-500">
            {formatSource(report.sourceName)}
          </span>
          {report.waterBody && (
            <a
              href={`/water/${report.waterBody.slug}`}
              className="ml-2 text-sm font-semibold text-blue-700 hover:underline"
            >
              {report.waterBody.name}
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          {report.reportDate && (
            <span className="text-xs text-gray-400">{report.reportDate}</span>
          )}
          {report.sentiment && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${sentimentColors[report.sentiment] ?? 'bg-gray-100 text-gray-800'}`}
            >
              {report.sentiment}
            </span>
          )}
        </div>
      </div>

      {report.conditionsSummary && (
        <p className="mt-2 text-sm text-gray-700">{report.conditionsSummary}</p>
      )}

      {report.flyPatternsMentioned.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {report.flyPatternsMentioned.map((fly) => (
            <span key={fly} className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
              {fly}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
