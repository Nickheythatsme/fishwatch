import { deriveSourceCredits, type SourceCredit } from '@/components/reports/source-utils'

interface AttributableReport {
  sourceName: string
  sourceUrl?: string | null
}

/**
 * Per-water "Reports sourced from" credit block. Lists the distinct fly
 * shops/sites contributing recent reports to this water, each as a *followable*
 * outbound link to the shop homepage. These are intentional credit links — we
 * want the goodwill/backlink reciprocity, so deliberately no `nofollow`
 * (`rel="noopener noreferrer"` is for safety only).
 *
 * Renders nothing when there are no reports.
 */
export function SourceAttribution({ reports }: { reports: readonly AttributableReport[] }) {
  const credits: SourceCredit[] = deriveSourceCredits(reports)
  if (credits.length === 0) return null

  return (
    <section aria-label="Report sources" className="mt-6 font-label text-xs text-on-surface-variant">
      <span className="font-bold uppercase tracking-wider">Reports sourced from</span>{' '}
      <ul className="mt-1 inline-flex flex-wrap items-center gap-x-2 gap-y-1">
        {credits.map((credit) => (
          <li key={credit.sourceName}>
            {credit.url ? (
              <a
                href={credit.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary hover:underline"
              >
                {credit.label} ↗
              </a>
            ) : (
              <span className="font-semibold text-on-surface">{credit.label}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
