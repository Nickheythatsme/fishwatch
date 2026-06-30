import Link from 'next/link'
import type { ComparePairLink } from '@/lib/compare/pairs'

interface RelatedCompareProps {
  /** Already gated + capped via `selectComparePairLinks` — never a noindex pair. */
  pairs: ComparePairLink[]
}

/**
 * Server-rendered "Compare with nearby waters" block: contextual links to
 * curated, publishable `/compare/[pair]` matchups (issue #147). Every pair
 * passed in is already filtered through `isPublishable()` by the caller —
 * this component is purely presentational.
 */
export function RelatedCompare({ pairs }: RelatedCompareProps) {
  if (pairs.length === 0) return null

  return (
    <section aria-labelledby="related-compare-heading">
      <h2
        id="related-compare-heading"
        className="mb-4 font-headline text-lg font-bold text-on-surface"
      >
        Compare With Nearby Waters
      </h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {pairs.map((pair) => (
          <li key={`${pair.slugA}-vs-${pair.slugB}`}>
            <Link
              href={`/compare/${pair.slugA}-vs-${pair.slugB}`}
              className="block rounded-xl bg-surface-container-low px-4 py-3 font-body text-sm text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
            >
              {pair.nameA} <span className="text-on-surface-variant">vs.</span> {pair.nameB}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
