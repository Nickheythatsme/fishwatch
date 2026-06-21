import { Tag } from '@/components/ui/Tag'
import { relativeTime } from '@/components/signals/score-utils'
import { deriveFreshness, type FreshnessInputs } from './freshness-utils'

type FreshnessBadgeProps = Omit<FreshnessInputs, 'now'> & {
  className?: string
}

/**
 * Per-water data-freshness / confidence badge. Surfaces, at a glance, how many
 * distinct sources back the current signal and how recent the underlying data
 * is — turning thin/stale/single-source data into an honesty feature rather than
 * hiding it.
 *
 * All inputs are derived on the server from data the page already fetches
 * (`recentReports`, `gaugeReadings`, and the signal `scoreDate`). The no-data,
 * single-source, and stale cases are all handled explicitly.
 */
export function FreshnessBadge({
  reports,
  gaugeReadings,
  scoreDate,
  className,
}: FreshnessBadgeProps) {
  const { tier, sourceCount, freshestDate, label, variant } = deriveFreshness({
    reports,
    gaugeReadings,
    scoreDate,
  })

  const sourceText =
    sourceCount === 0 ? 'No shop reports' : `${sourceCount} ${sourceCount === 1 ? 'source' : 'sources'}`
  const recencyText = freshestDate ? `freshest data ${relativeTime(freshestDate)}` : null

  // When there's genuinely nothing to score, say so plainly instead of stitching
  // together "0 sources" fragments.
  const detail =
    tier === 'none'
      ? 'Not enough recent reports or gauge data to score this water yet.'
      : [sourceText, recencyText].filter(Boolean).join(' · ')

  return (
    <div
      className={'flex flex-wrap items-center gap-x-2 gap-y-1' + (className ? ' ' + className : '')}
      aria-label={`Data confidence: ${label}. ${detail}`}
    >
      <Tag variant={variant}>
        <span
          aria-hidden="true"
          className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-current"
        />
        {label}
      </Tag>
      <span className="font-label text-xs text-on-surface-variant">{detail}</span>
    </div>
  )
}
