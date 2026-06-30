import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ssrQuery } from '@/lib/graphql/execute'
import { buildBasinMetadata, SITE_URL } from '@/lib/seo/metadata'
import { buildBreadcrumbList, buildItemList, assembleGraph } from '@/lib/seo/jsonld'
import { JsonLd } from '@/components/seo/JsonLd'
import { Breadcrumbs, type Crumb } from '@/components/shell/Breadcrumbs'
import { BackButton } from '@/components/shell/BackButton'
import { IntelligenceCard, type IntelligenceCardWaterBody } from '@/components/intelligence/IntelligenceCard'
import { RelatedCompare } from '@/components/water/RelatedCompare'
import { NearbyTowns } from '@/components/water/NearbyTowns'
import { selectComparePairLinks, type ComparePairLinkWater } from '@/lib/compare/pairs'
import { relevantPublishableTowns, type NearGatingWater } from '@/lib/near/gating'

export const revalidate = 1800
export const dynamicParams = true

const BASIN_PAGE_QUERY = /* GraphQL */ `
  query BasinPage($slug: String!) {
    basin(slug: $slug) {
      id
      name
      slug
      region
      description
      waters {
        id
        name
        slug
        typicalSpecies
        currentFlow
        latitude
        longitude
        currentSignal {
          compositeScore
          flowScore
          sentimentScore
          consensusScore
          topSection
        }
        recentReports(limit: 1) {
          reportDate
        }
      }
    }
  }
`

const BASIN_SLUGS_QUERY = /* GraphQL */ `
  query BasinSlugs {
    basins {
      slug
    }
  }
`

// Mirrors `app/near/page.tsx`'s gating query — only the fields needed to
// decide whether a town's `/near/[town]` page is currently indexable, fetched
// globally (not just this basin's waters) because a town's publishability
// depends on every water near it, not only this basin's members.
const ALL_WATERS_NEAR_GATING_QUERY = /* GraphQL */ `
  query AllWatersNearGating {
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

interface BasinWater extends IntelligenceCardWaterBody {
  latitude: number | null
  longitude: number | null
  recentReports: Array<{ reportDate: string | null }>
}

interface Basin {
  id: string
  name: string
  slug: string
  region: string
  description: string | null
  waters: BasinWater[]
}

interface BasinPageData {
  basin: Basin | null
}

interface BasinSlugsData {
  basins: { slug: string }[]
}

interface AllWatersNearGatingData {
  waterBodies: NearGatingWater[]
}

async function fetchAllWatersForNearGating(): Promise<NearGatingWater[]> {
  try {
    const data = await ssrQuery<AllWatersNearGatingData>(ALL_WATERS_NEAR_GATING_QUERY)
    return data.waterBodies
  } catch {
    // Contextual near-town links are a non-critical enhancement; never fail
    // the page if this query errors. Render no nearby-towns block instead.
    return []
  }
}

// Cap for the basin page's contextual "Compare with…" block — slightly lower
// than the water page's default so the combined compare + near-town links
// stay within the ≤5 per-page SEO link cap (issue #147).
const MAX_BASIN_COMPARE_LINKS = 3

export async function generateStaticParams() {
  try {
    const data = await ssrQuery<BasinSlugsData>(BASIN_SLUGS_QUERY)
    return data.basins.map((b) => ({ slug: b.slug }))
  } catch {
    // If basins table is empty or unreachable at build time, rely on on-demand
    // rendering (`dynamicParams = true`) instead of failing the build.
    return []
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  let data: BasinPageData
  try {
    data = await ssrQuery<BasinPageData>(BASIN_PAGE_QUERY, { slug })
  } catch {
    return {}
  }
  if (!data.basin) return {}
  return buildBasinMetadata(data.basin)
}

export default async function BasinPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  let data: BasinPageData
  try {
    data = await ssrQuery<BasinPageData>(BASIN_PAGE_QUERY, { slug })
  } catch {
    notFound()
  }

  if (!data.basin) notFound()

  const basin = data.basin

  // Rank waters by composite score descending; waters with no current signal
  // sink to the bottom (score −1 sentinel keeps the sort stable).
  const sortedWaters = [...basin.waters].sort(
    (a, b) =>
      (b.currentSignal?.compositeScore ?? -1) - (a.currentSignal?.compositeScore ?? -1)
  )

  const breadcrumbs: Crumb[] = [
    { label: 'Home', href: '/' },
    { label: basin.name },
  ]

  const jsonLd = assembleGraph([
    buildBreadcrumbList(breadcrumbs, SITE_URL),
    buildItemList(
      sortedWaters.map((w) => ({ name: w.name, slug: w.slug })),
      SITE_URL,
      `${basin.name} Waters`
    ),
  ])

  // graphql-js returns null-prototype objects; spread to plain objects so React
  // can serialize them across the Server→Client boundary to IntelligenceCard.
  // NOTE: recentReports (added to BasinWater for #147 near-gating) is also a
  // null-prototype array element — plainify it too, or the prerender serializer
  // throws "null prototypes are not supported" on [{reportDate}].
  const waters: IntelligenceCardWaterBody[] = sortedWaters.map((w) => ({
    ...w,
    currentSignal: w.currentSignal ? { ...w.currentSignal } : null,
    recentReports: w.recentReports.map((r) => ({ ...r })),
  }))

  // Gating-aware contextual links (issue #147): in-basin "Compare with…"
  // pairs and relevant "Fishing Near {town}" links. Both enforce
  // isPublishable() on every linked target — never a 404 or noindex page.
  const comparePairWaters: ComparePairLinkWater[] = basin.waters.map((w) => ({
    slug: w.slug,
    name: w.name,
    basin: { slug: basin.slug },
    currentSignal: w.currentSignal ? { ...w.currentSignal } : null,
    recentReports: w.recentReports.map((r) => ({ ...r })),
  }))
  const comparePairs = selectComparePairLinks(comparePairWaters, () => true, MAX_BASIN_COMPARE_LINKS)

  const allWatersForNearGating = await fetchAllWatersForNearGating()
  const nearbyTowns = relevantPublishableTowns(basin.waters, allWatersForNearGating)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {jsonLd && <JsonLd data={jsonLd} />}
      <BackButton className="mb-4 md:hidden" />
      <Breadcrumbs items={breadcrumbs} className="mb-4" />

      <section className="rounded-2xl bg-surface-container-low p-6 sm:p-8">
        <h1 className="font-headline text-4xl italic text-primary">{basin.name}</h1>
        {basin.description && (
          <p className="mt-3 max-w-prose font-body text-base leading-relaxed text-on-surface-variant">
            {basin.description}
          </p>
        )}
        <p className="mt-2 font-label text-xs text-on-surface-variant">
          {waters.length} water{waters.length !== 1 ? 's' : ''} · conditions updated every 30
          minutes
        </p>
      </section>

      {waters.length > 0 ? (
        <section className="mt-8" aria-labelledby="basin-waters-heading">
          <h2
            id="basin-waters-heading"
            className="mb-4 font-headline text-lg font-bold text-on-surface"
          >
            Fishing Conditions
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {waters.map((water) => (
              <IntelligenceCard key={water.id} waterBody={water} />
            ))}
          </div>
        </section>
      ) : (
        <p className="mt-8 font-body text-sm text-on-surface-variant">
          No waters in this basin yet — check back soon.
        </p>
      )}

      {(comparePairs.length > 0 || nearbyTowns.length > 0) && (
        <div className="mt-8 space-y-6">
          <RelatedCompare pairs={comparePairs} />
          <NearbyTowns towns={nearbyTowns} />
        </div>
      )}
    </div>
  )
}
