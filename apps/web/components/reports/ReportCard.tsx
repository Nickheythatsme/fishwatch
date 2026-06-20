import { Tag, type TagVariant } from '@/components/ui/Tag'
import { formatSourceName } from '@/components/reports/source-utils'

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
  flowCommentary?: string | null
  waterBody?: {
    name: string
    slug: string
  } | null
}

const SENTIMENT_VARIANT: Record<string, TagVariant> = {
  excellent: 'secondary',
  good: 'secondary',
  fair: 'tertiary',
  poor: 'error',
  off: 'error',
}

export function ReportCard({ report }: { report: Report }) {
  return (
    <article className="rounded-2xl bg-surface-container-lowest p-6 transition-colors hover:bg-surface-container">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-label text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            {formatSourceName(report.sourceName)}
          </p>
          {report.waterBody && (
            <a
              href={`/water/${report.waterBody.slug}`}
              className="font-headline text-lg italic text-primary hover:underline"
            >
              {report.waterBody.name}
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          {report.reportDate && (
            <span className="font-label text-xs text-outline">{report.reportDate}</span>
          )}
          {report.sentiment && (
            <Tag variant={SENTIMENT_VARIANT[report.sentiment.toLowerCase()] ?? 'neutral'}>
              {report.sentiment}
            </Tag>
          )}
        </div>
      </div>

      {report.conditionsSummary && (
        <p className="mt-3 font-body text-sm text-on-surface">{report.conditionsSummary}</p>
      )}

      {report.flyPatternsMentioned.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {report.flyPatternsMentioned.map((fly) => (
            <Tag key={fly} variant="primary">
              {fly}
            </Tag>
          ))}
        </div>
      )}

      {report.sourceUrl && (
        <a
          href={report.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1 font-label text-xs font-semibold text-primary hover:underline"
        >
          View original report ↗
        </a>
      )}
    </article>
  )
}
