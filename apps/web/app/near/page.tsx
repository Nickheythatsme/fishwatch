import type { Metadata } from 'next'
import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { ssrQuery } from '@/lib/graphql/execute'
import { MAX_NEAR_DISTANCE_MILES } from '@/lib/near/towns'
import { publishableTowns, type NearGatingWater } from '@/lib/near/gating'
import { buildNearIndexMetadata, SITE_URL } from '@/lib/seo/metadata'
import { buildBreadcrumbList, buildItemList, assembleGraph } from '@/lib/seo/jsonld'
import { JsonLd } from '@/components/seo/JsonLd'
import { Breadcrumbs, type Crumb } from '@/components/shell/Breadcrumbs'
import { BackButton } from '@/components/shell/BackButton'

// Static, always-publishable hub page (issue #147) — revalidated on the same
// cadence as the leaf pages so newly-(un)publishable towns surface quickly.
export const revalidate = 1800

// Only the fields needed to gate each curated town's `/near/[town]` page —
// mirrors `app/sitemap.ts`'s near-entry query so the two never drift apart.
const NEAR_INDEX_QUERY = /* GraphQL */ `
  query NearIndex {
    waterBodies {
      latitude
      longitude
      currentSignal {
        compositeScore
        flowScore
        sentimentScore
        consensusScore
      }
      recentReports(limit: 1) {
        reportDate
      }
    }
  }
`

interface NearIndexData {
  waterBodies: NearGatingWater[]
}

export function generateMetadata(): Metadata {
  return buildNearIndexMetadata()
}

export default async function NearIndexPage() {
  let waters: NearGatingWater[] = []
  try {
    const data = await ssrQuery<NearIndexData>(NEAR_INDEX_QUERY)
    waters = data.waterBodies
  } catch {
    // Data source unreachable — render the hub with no towns rather than 500.
    waters = []
  }

  // Hard gating requirement (issue #147): only link towns whose near page is
  // currently indexable. Linking an unpublishable town would point crawlers
  // at a noindex page.
  const towns = publishableTowns(waters)

  const breadcrumbs: Crumb[] = [{ label: 'Home', href: '/' }, { label: 'Near You' }]

  const jsonLd = assembleGraph([
    buildBreadcrumbList(breadcrumbs, SITE_URL),
    buildItemList(
      towns.map((t) => ({ name: `${t.name}, ${t.state}`, slug: t.slug })),
      SITE_URL,
      'Fishing Near You',
      (entry) => `${SITE_URL}/near/${entry.slug}`
    ),
  ])

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-24 md:pb-8">
      {jsonLd && <JsonLd data={jsonLd} />}
      <BackButton className="mb-4 md:hidden" />
      <Breadcrumbs items={breadcrumbs} className="mb-4" />

      <section className="rounded-2xl bg-surface-container-low p-6 sm:p-8">
        <p className="font-label text-xs font-bold uppercase tracking-[0.2em] text-secondary">
          Local Conditions
        </p>
        <h1 className="mt-1 font-headline text-3xl font-bold italic text-on-surface">
          Fishing Near You
        </h1>
        <p className="mt-2 font-body text-sm leading-relaxed text-outline">
          Pick a town to see fishing conditions ranked by distance and score within{' '}
          {MAX_NEAR_DISTANCE_MILES} miles.
        </p>
      </section>

      {towns.length === 0 ? (
        <p className="mt-8 font-body text-sm text-on-surface-variant">
          No towns have current fishing conditions nearby right now — check back soon.
        </p>
      ) : (
        <ul
          className="mt-8 grid gap-3 sm:grid-cols-2"
          aria-label="Towns with nearby fishing conditions"
        >
          {towns.map((town) => (
            <li key={town.slug}>
              <Link
                href={`/near/${town.slug}`}
                className="flex items-center gap-3 rounded-xl bg-surface-container-low px-4 py-3 font-body text-sm text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
              >
                <MapPin className="h-4 w-4 shrink-0 text-secondary" aria-hidden />
                {town.name}, {town.state}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
