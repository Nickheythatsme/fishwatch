import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ssrQuery } from '@/lib/graphql/execute'
import { TOWNS, MAX_NEAR_DISTANCE_MILES, type Town } from '@/lib/near/towns'
import { rankWatersNear } from '@/lib/near/rank'
import { buildNearMetadata, SITE_URL } from '@/lib/seo/metadata'
import { isPublishable } from '@/lib/seo/gating'
import { buildBreadcrumbList, buildItemList, assembleGraph } from '@/lib/seo/jsonld'
import { JsonLd } from '@/components/seo/JsonLd'
import { Breadcrumbs, type Crumb } from '@/components/shell/Breadcrumbs'
import { BackButton } from '@/components/shell/BackButton'
import { IntelligenceCard } from '@/components/intelligence/IntelligenceCard'

export const revalidate = 1800
// Only the curated town slugs are valid; anything else 404s immediately.
export const dynamicParams = false

const NEAR_PAGE_QUERY = /* GraphQL */ `
  query NearPage {
    waterBodies {
      id
      name
      slug
      latitude
      longitude
      typicalSpecies
      currentFlow
      basin {
        name
        slug
      }
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
`

interface NearWater {
  id: string
  name: string
  slug: string
  latitude: number | null
  longitude: number | null
  typicalSpecies: string[]
  currentFlow: number | null
  basin: { name: string; slug: string } | null
  currentSignal: {
    compositeScore: number
    flowScore: number | null
    sentimentScore: number | null
    consensusScore: number | null
    topSection: string | null
  } | null
  recentReports: Array<{ reportDate: string | null }>
}

interface NearPageData {
  waterBodies: NearWater[]
}

type RankedNearWater = NearWater & { distanceMiles: number; rankScore: number }

export function generateStaticParams() {
  return TOWNS.map((t) => ({ town: t.slug }))
}

async function fetchAndRank(town: Town): Promise<RankedNearWater[]> {
  const data = await ssrQuery<NearPageData>(NEAR_PAGE_QUERY)
  return rankWatersNear(data.waterBodies, town) as RankedNearWater[]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ town: string }>
}): Promise<Metadata> {
  const { town: townSlug } = await params
  const town = TOWNS.find((t) => t.slug === townSlug)
  if (!town) return {}

  let ranked: RankedNearWater[]
  try {
    ranked = await fetchAndRank(town)
  } catch {
    return buildNearMetadata(town)
  }

  const publishable = ranked.some((r) =>
    isPublishable({
      signal: r.currentSignal,
      latestReportDate: r.recentReports[0]?.reportDate ?? null,
    })
  )

  const meta = buildNearMetadata(town)
  if (!publishable) {
    meta.robots = { index: false, follow: true }
  }
  return meta
}

export default async function NearPage({
  params,
}: {
  params: Promise<{ town: string }>
}) {
  const { town: townSlug } = await params
  const town = TOWNS.find((t) => t.slug === townSlug)
  if (!town) notFound()

  let ranked: RankedNearWater[]
  try {
    ranked = await fetchAndRank(town)
  } catch {
    notFound()
  }

  // Deep-copy to plain objects so graphql-js null-prototype objects serialize
  // cleanly across the Server→Client boundary to IntelligenceCard. Every nested
  // object/array (basin, currentSignal, recentReports, typicalSpecies) must be
  // rebuilt — a shallow spread leaves nested null-prototype objects unconverted.
  const waters = ranked.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    latitude: r.latitude,
    longitude: r.longitude,
    typicalSpecies: [...r.typicalSpecies],
    currentFlow: r.currentFlow,
    basin: r.basin ? { name: r.basin.name, slug: r.basin.slug } : null,
    currentSignal: r.currentSignal ? { ...r.currentSignal } : null,
    recentReports: r.recentReports.map((rr) => ({ reportDate: rr.reportDate })),
    distanceMiles: r.distanceMiles,
    rankScore: r.rankScore,
  }))

  const breadcrumbs: Crumb[] = [
    { label: 'Home', href: '/' },
    { label: 'Near' },
    { label: `${town.name}, ${town.state}` },
  ]

  const jsonLd = assembleGraph([
    buildBreadcrumbList(breadcrumbs, SITE_URL),
    buildItemList(
      waters.map((w) => ({ name: w.name, slug: w.slug })),
      SITE_URL,
      `Best Fishing Near ${town.name}, ${town.state}`
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
          Fishing Near {town.name}
        </h1>
        <p className="mt-2 font-body text-sm leading-relaxed text-outline">
          Waters within {MAX_NEAR_DISTANCE_MILES} miles · ranked by score &amp; distance ·
          updated every 30 minutes
        </p>
      </section>

      {waters.length === 0 ? (
        <p className="mt-8 font-body text-sm text-on-surface-variant">
          No waters found within {MAX_NEAR_DISTANCE_MILES} miles of {town.name}.
        </p>
      ) : (
        <ol className="mt-8 space-y-3" aria-label={`Waters near ${town.name}`}>
          {waters.map((w, i) => (
            <li key={w.id} className="flex items-start gap-4">
              <span
                aria-label={`Rank ${i + 1}`}
                className="mt-4 w-7 shrink-0 text-right font-headline text-lg font-bold text-on-surface-variant"
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <IntelligenceCard waterBody={w} />
                <p className="mt-1 pl-1 font-label text-xs text-on-surface-variant">
                  {Math.round(w.distanceMiles)} mi away
                  {w.basin && (
                    <>
                      {' · '}
                      <Link
                        href={`/basin/${w.basin.slug}`}
                        className="hover:text-on-surface focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-container"
                      >
                        {w.basin.name}
                      </Link>
                    </>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
