import type { Metadata } from 'next'
import Link from 'next/link'
import { ssrQuery } from '@/lib/graphql/execute'
import { selectComparePairLinks, type ComparePairLinkWater } from '@/lib/compare/pairs'
import { buildCompareIndexMetadata, SITE_URL } from '@/lib/seo/metadata'
import { buildBreadcrumbList, buildItemList, assembleGraph } from '@/lib/seo/jsonld'
import { JsonLd } from '@/components/seo/JsonLd'
import { Breadcrumbs, type Crumb } from '@/components/shell/Breadcrumbs'
import { BackButton } from '@/components/shell/BackButton'

// Static, always-publishable hub page (issue #147) — NOT in global nav, only
// linked contextually from water/basin pages. Revalidated like the leaves.
export const revalidate = 1800

// Mirrors `app/compare/[pair]/page.tsx`'s `COMPARE_STATIC_QUERY` shape, plus
// `name` for display labels.
const COMPARE_INDEX_QUERY = /* GraphQL */ `
  query CompareIndex {
    waterBodies {
      slug
      name
      basin {
        slug
      }
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

interface CompareIndexData {
  waterBodies: ComparePairLinkWater[]
}

export function generateMetadata(): Metadata {
  return buildCompareIndexMetadata()
}

export default async function CompareIndexPage() {
  let waters: ComparePairLinkWater[] = []
  try {
    const data = await ssrQuery<CompareIndexData>(COMPARE_INDEX_QUERY)
    waters = data.waterBodies
  } catch {
    // Data source unreachable — render the hub with no pairs rather than 500.
    waters = []
  }

  // Hard gating requirement (issue #147): only curated pairs where BOTH
  // waters are publishable — every other pair is noindex and must not be
  // linked. No cap here (unlike the contextual water/basin blocks) — this
  // index page's whole purpose is to list every indexable pair.
  const pairs = selectComparePairLinks(waters, () => true, Infinity)

  const breadcrumbs: Crumb[] = [{ label: 'Home', href: '/' }, { label: 'Compare' }]

  const jsonLd = assembleGraph([
    buildBreadcrumbList(breadcrumbs, SITE_URL),
    buildItemList(
      pairs.map((p) => ({ name: `${p.nameA} vs. ${p.nameB}`, slug: `${p.slugA}-vs-${p.slugB}` })),
      SITE_URL,
      'Compare Fishing Waters',
      (entry) => `${SITE_URL}/compare/${entry.slug}`
    ),
  ])

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-24 md:pb-8">
      {jsonLd && <JsonLd data={jsonLd} />}
      <BackButton className="mb-4 md:hidden" />
      <Breadcrumbs items={breadcrumbs} className="mb-4" />

      <section className="rounded-2xl bg-surface-container-low p-6 sm:p-8">
        <p className="font-label text-xs font-bold uppercase tracking-[0.2em] text-secondary">
          Head to Head
        </p>
        <h1 className="mt-1 font-headline text-3xl font-bold italic text-on-surface">
          Compare Fishing Waters
        </h1>
        <p className="mt-2 font-body text-sm leading-relaxed text-outline">
          Side-by-side conditions for curated water matchups, updated every 30 minutes.
        </p>
      </section>

      {pairs.length === 0 ? (
        <p className="mt-8 font-body text-sm text-on-surface-variant">
          No comparisons have current fishing conditions right now — check back soon.
        </p>
      ) : (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2" aria-label="Water matchups">
          {pairs.map((p) => (
            <li key={`${p.slugA}-vs-${p.slugB}`}>
              <Link
                href={`/compare/${p.slugA}-vs-${p.slugB}`}
                className="block rounded-xl bg-surface-container-low px-4 py-3 font-body text-sm text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
              >
                {p.nameA} <span className="text-on-surface-variant">vs.</span> {p.nameB}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
