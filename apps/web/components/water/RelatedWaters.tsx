import Link from 'next/link'

/**
 * Minimal shape needed to link to a sibling water. Sourced from the
 * `waterBodies(region:)` GraphQL field (slug + name).
 */
export interface RelatedWater {
  slug: string
  name: string
}

interface RelatedWatersProps {
  /** Sibling waters to link to (current water already excluded by the caller). */
  waters: RelatedWater[]
  /** Region slug of the current water, e.g. `oregon`, used for the heading. */
  region: string
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
 * same region. These crawlable links build the hub-and-spoke internal-link graph
 * the SEO strategy calls for.
 *
 * Interim data source: same `region` (the only grouping that exists today). Epic
 * 4 (#65) adds a `basin_id` column; switch this list to "other waters in this
 * basin" then — tracked in #67.
 *
 * Deferred links: the SEO roadmap also wants links to the basin hub (#67) and
 * the leaderboard (#63). Those routes (`/basin/*`, `/leaderboard`) 404 today, so
 * they are intentionally omitted here and added when #63 / #67 land.
 */
export function RelatedWaters({ waters, region }: RelatedWatersProps) {
  if (waters.length === 0) return null

  const regionLabel = titleCaseRegion(region)

  return (
    <section aria-labelledby="related-waters-heading">
      <h2
        id="related-waters-heading"
        className="mb-4 font-headline text-lg font-bold text-on-surface"
      >
        More waters in {regionLabel}
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
