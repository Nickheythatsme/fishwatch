import Link from 'next/link'

/**
 * Minimal shape needed to link to a sibling water. Sourced from either the
 * basin's `waters` list or the `waterBodies(region:)` GraphQL field.
 */
export interface RelatedWater {
  slug: string
  name: string
}

interface RelatedWatersProps {
  /** Sibling waters to link to (current water already excluded by the caller). */
  waters: RelatedWater[]
  /** Region slug of the current water, e.g. `oregon` — used as fallback heading when no basin. */
  region: string
  /** Basin the water belongs to. When present, the heading links to the basin hub. */
  basin?: { name: string; slug: string } | null
}

function titleCaseRegion(s: string): string {
  return s
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Server-rendered "related waters" block: internal links to other waters in the
 * same basin (when available) or the same region (fallback). These crawlable
 * links build the hub-and-spoke internal-link graph the SEO strategy calls for.
 *
 * When `basin` is provided the heading links to the `/basin/{slug}` hub page.
 * When `basin` is null or omitted the heading falls back to the region label
 * with no link, matching the pre-basins behaviour.
 */
export function RelatedWaters({ waters, region, basin }: RelatedWatersProps) {
  if (waters.length === 0) return null

  const headingLabel = basin ? basin.name : titleCaseRegion(region)
  const basinHref = basin ? `/basin/${basin.slug}` : null

  return (
    <section aria-labelledby="related-waters-heading">
      <h2
        id="related-waters-heading"
        className="mb-4 font-headline text-lg font-bold text-on-surface"
      >
        More waters in{' '}
        {basinHref ? (
          <Link
            href={basinHref}
            className="text-primary underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
          >
            {headingLabel}
          </Link>
        ) : (
          headingLabel
        )}
      </h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {waters.map((water) => (
          <li key={water.slug}>
            <Link
              href={`/water/${water.slug}`}
              className="block rounded-xl bg-surface-container-low px-4 py-3 font-body text-sm text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
            >
              {water.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
