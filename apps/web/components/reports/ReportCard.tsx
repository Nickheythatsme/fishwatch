import { Tag, type TagVariant } from '@/components/ui/Tag'

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

const SENTIMENT_VARIANT: Record<string, TagVariant> = {
  excellent: 'secondary',
  good: 'secondary',
  fair: 'tertiary',
  poor: 'error',
  off: 'error',
}

function formatSource(name: string): string {
  return name
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function ReportCard({ report }: { report: Report }) {
  return (
    <article className="rounded-2xl bg-surface-container-lowest p-6 transition-colors hover:bg-surface-container">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-label text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            {formatSource(report.sourceName)}
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
    </article>
  )
}
