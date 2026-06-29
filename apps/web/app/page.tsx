import type { Metadata } from 'next'
import { ssrQuery } from '@/lib/graphql/execute'
import { DashboardView } from '@/components/intelligence/DashboardView'
import type { RegionConditions } from '@/components/intelligence/LocalConditionsPanel'
import type { SortOption } from '@/components/intelligence/IntelligencePanel'
import { SITE_URL } from '@/lib/seo/metadata'
import { JsonLd } from '@/components/seo/JsonLd'
import { buildHomePageGraph } from '@/lib/seo/jsonld'
import { isPublishable } from '@/lib/seo/gating'
import { scoreToLabel } from '@/components/signals/score-utils'
import {
  pickRegion,
  VALID_SORTS,
  type DashboardWaterBody,
} from '@/components/intelligence/dashboard-utils'

// Self-referencing canonical for the homepage. Without this, Google saw
// `score.fish` and `www.score.fish` as duplicates and dropped the homepage from
// the index ("Duplicate without user-selected canonical"). See issue #115.
export const metadata: Metadata = {
  alternates: { canonical: `${SITE_URL}/` },
}

// Revalidate the server-rendered homepage every 30 minutes, aligned with the
// scoring pipeline cron so the indexed ranked list stays fresh without
// rebuilding on every request.
export const revalidate = 1800

const DASHBOARD_QUERY = /* GraphQL */ `
  query Dashboard {
    waterBodies {
      id
      name
      slug
      region
      latitude
      longitude
      typicalSpecies
      currentSignal {
        compositeScore
        flowScore
        sentimentScore
        consensusScore
        scoreDate
        topSection
      }
      currentFlow
      recentReports(limit: 1) {
        reportDate
      }
    }
  }
`

const REGION_CONDITIONS_QUERY = /* GraphQL */ `
  query RegionConditions($region: String!) {
    regionConditions(region: $region) {
      flowTrend
      hatchVolume
      airTempF
      weatherLabel
      locationLabel
    }
  }
`

// The homepage query fetches everything `DashboardWaterBody` needs for the map
// island plus the latest report date, which the SEO gate (`isPublishable`)
// requires to decide whether a water is index-worthy. `recentReports` is stripped
// before the data crosses into the client island below.
interface QueryWaterBody extends DashboardWaterBody {
  recentReports: Array<{ reportDate: string | null }>
}

interface DashboardData {
  waterBodies: QueryWaterBody[]
}

// A crawlable water link rendered in the static HTML (outside the Leaflet
// client island), gated for parity with sitemap.ts.
interface PublishableWaterLink {
  id: string
  name: string
  slug: string
  compositeScore: number
}

interface RegionConditionsData {
  regionConditions: RegionConditions | null
}

function ErrorState() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <p className="rounded-2xl bg-error-container/30 p-6 text-error">
        Failed to load fishing data. Please try again.
      </p>
    </div>
  )
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>
}) {
  const { sort } = await searchParams
  const sortBy: SortOption = VALID_SORTS.includes(sort as SortOption)
    ? (sort as SortOption)
    : 'signal'

  let data: DashboardData
  try {
    data = await ssrQuery<DashboardData>(DASHBOARD_QUERY)
  } catch {
    return <ErrorState />
  }

  // graphql-js builds result objects with a null prototype, which React refuses
  // to serialize across the Server→Client boundary. DashboardView is a client
  // island, so copy each water body (and its nested signal) into plain object
  // literals before handing them over. `recentReports` is SSR-only gating data,
  // so destructure it out and keep the client payload unchanged.
  const waterBodies: DashboardWaterBody[] = data.waterBodies.map(
    ({ recentReports: _recentReports, ...wb }) => ({
      ...wb,
      currentSignal: wb.currentSignal ? { ...wb.currentSignal } : null,
    })
  )

  // Crawlable, server-rendered water links. Apply the exact same publish gate
  // as sitemap.ts (`isPublishable`) so the static HTML never advertises a water
  // the sitemap excludes. `isPublishable` already rejects null / no-data
  // signals, so `currentSignal` is non-null for everything that passes.
  const publishableWaters: PublishableWaterLink[] = data.waterBodies
    .filter((wb) =>
      isPublishable({
        signal: wb.currentSignal,
        latestReportDate: wb.recentReports[0]?.reportDate ?? null,
      })
    )
    .map((wb) => ({
      id: wb.id,
      name: wb.name,
      slug: wb.slug,
      compositeScore: wb.currentSignal!.compositeScore,
    }))
    .sort((a, b) => b.compositeScore - a.compositeScore)

  const region = pickRegion(waterBodies)

  // Region conditions depend on the chosen region, so this is a deliberate
  // second hop. A failure here only blanks the Local Conditions panel — it must
  // not take down the ranked list — so fall back to null.
  let regionConditions: RegionConditions | null = null
  try {
    const conditionsData = await ssrQuery<RegionConditionsData>(REGION_CONDITIONS_QUERY, {
      region,
    })
    regionConditions = conditionsData.regionConditions
      ? { ...conditionsData.regionConditions }
      : null
  } catch {
    regionConditions = null
  }

  // Organization + WebSite structured data for the homepage. `buildHomePageGraph`
  // always returns a graph here, but guard for the Graph | null contract.
  const jsonLdGraph = buildHomePageGraph(SITE_URL)

  return (
    <>
      {jsonLdGraph && <JsonLd data={jsonLdGraph} />}
      <DashboardView
        waterBodies={waterBodies}
        region={region}
        regionConditions={regionConditions}
        sortBy={sortBy}
      />
      {/*
        Server-rendered, crawlable text + water links. The dashboard above is a
        Leaflet client island, so a no-JS crawler sees no <h1> and no anchors
        without this block (issue #124). It lives outside the island and is
        visually hidden (`sr-only` keeps it in the DOM and accessible to both
        crawlers and screen readers — it is NOT display:none) so it provides the
        SEO/accessibility surface without duplicating the interactive map UI.
      */}
      <section aria-labelledby="home-heading" className="sr-only">
        <h1 id="home-heading">Pacific Northwest Fishing Conditions &amp; River Reports</h1>
        <p>
          Score.Fish combines fly shop reports with live USGS gauge data into a single
          composite fishing score for rivers and streams across the Pacific Northwest.
          Browse current conditions for every water with a recent report below.
        </p>
        {publishableWaters.length > 0 && (
          <nav aria-label="Waters with current fishing reports">
            {/*
              tabIndex={-1}: this is a visually-hidden, crawler/screen-reader
              surface. Without it the clipped (`sr-only`) anchors stay in the
              sequential tab order, giving sighted keyboard users invisible focus
              stops with no visible focus ring (WCAG 2.4.7). Removing them from
              tab order keeps the links crawlable and reachable via a screen
              reader's virtual cursor / link list, while the same water links
              remain keyboard-operable in the visible DashboardView map above.
            */}
            <ul>
              {publishableWaters.map((wb) => (
                <li key={wb.id}>
                  <a href={`/water/${wb.slug}`} tabIndex={-1}>
                    {wb.name} — {scoreToLabel(wb.compositeScore)} (
                    {wb.compositeScore.toFixed(1)}/10)
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </section>
    </>
  )
}
