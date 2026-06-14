import { notFound } from 'next/navigation'
import { ssrQuery } from '@/lib/graphql/execute'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { Tag } from '@/components/ui/Tag'
import { SpeciesIcon } from '@/components/ui/SpeciesIcon'
import { ScoreBreakdown } from '@/components/signals/ScoreBreakdown'
import { isNoDataSignal } from '@/components/signals/score-utils'
import { ReportFeed } from '@/components/reports/ReportFeed'
import { GaugeStatus } from '@/components/gauges/GaugeStatus'
import { FlowChart } from '@/components/gauges/FlowChart'
import { BackButton } from '@/components/shell/BackButton'
// `WaterBodyMiniMap` is a Leaflet client island (it only runs in the browser).
// The `ssr: false` dynamic import lives in this 'use client' wrapper because
// Next.js disallows it directly in a Server Component. All other data is
// rendered in server HTML; the map receives its data as props.
import { WaterBodyMiniMapIsland } from '@/components/map/WaterBodyMiniMapIsland'

// Revalidate server-rendered pages every 30 minutes, aligned with the scoring
// pipeline cron so the indexed HTML stays fresh without rebuilding on request.
export const revalidate = 1800

// Pre-build the in-scope Oregon waters at build time; render any other water
// (WA/ID) on-demand the first time it's requested.
export const dynamicParams = true

const WATER_BODY_QUERY = /* GraphQL */ `
  query WaterBody($slug: String!) {
    waterBody(slug: $slug) {
      id
      name
      slug
      latitude
      longitude
      description
      typicalSpecies
      currentFlow
      currentSignal {
        compositeScore
        flowScore
        sentimentScore
        consensusScore
        recommendedSpecies
        recommendedFlies
        summary
        scoreDate
        topSection
      }
      signals(days: 30) {
        scoreDate
        compositeScore
      }
      recentReports(limit: 10) {
        id
        sourceName
        sourceUrl
        reportDate
        sentiment
        conditionsSummary
        flyPatternsMentioned
        speciesMentioned
        waterClarity
      }
      gaugeReadings(hours: 48) {
        measuredAt
        flowCfs
        waterTempF
        gaugeHeightFt
      }
    }
  }
`

interface Signal {
  compositeScore: number
  flowScore: number | null
  sentimentScore: number | null
  consensusScore: number | null
  recommendedSpecies: string[]
  recommendedFlies: string[]
  summary: string | null
  scoreDate: string | null
  topSection: string | null
}

interface SignalPoint {
  scoreDate: string
  compositeScore: number
}

interface Report {
  id: string
  sourceName: string
  sourceUrl: string | null
  reportDate: string | null
  sentiment: string | null
  conditionsSummary: string | null
  flyPatternsMentioned: string[]
  speciesMentioned: string[]
  waterClarity: string | null
}

interface GaugeReading {
  measuredAt: string
  flowCfs: number | null
  waterTempF: number | null
  gaugeHeightFt: number | null
}

interface WaterBody {
  id: string
  name: string
  slug: string
  latitude: number | null
  longitude: number | null
  description: string | null
  typicalSpecies: string[]
  currentFlow: number | null
  currentSignal: Signal | null
  signals: SignalPoint[]
  recentReports: Report[]
  gaugeReadings: GaugeReading[]
}

interface WaterPageData {
  waterBody: WaterBody | null
}

const OREGON_SLUGS_QUERY = /* GraphQL */ `
  query OregonWaterSlugs($region: String!) {
    waterBodies(region: $region) {
      slug
    }
  }
`

interface OregonSlugsData {
  waterBodies: { slug: string }[]
}

export async function generateStaticParams() {
  try {
    const data = await ssrQuery<OregonSlugsData>(OREGON_SLUGS_QUERY, {
      region: 'oregon',
    })
    return data.waterBodies.map((wb) => ({ slug: wb.slug }))
  } catch {
    // If the data source is unreachable at build time, fall back to rendering
    // every water on-demand (`dynamicParams = true`) instead of failing the build.
    return []
  }
}

export default async function WaterBodyPage({ params }: { params: { slug: string } }) {
  const { slug } = params

  // The `waterBody` resolver uses `.single()`, so PostgREST returns an error
  // (which `ssrQuery` re-throws) when no row matches an unknown slug. Treat that
  // throw as a 404 rather than letting it bubble up as a 500.
  let data: WaterPageData
  try {
    data = await ssrQuery<WaterPageData>(WATER_BODY_QUERY, { slug })
  } catch {
    notFound()
  }

  if (!data.waterBody) notFound()

  const wb = data.waterBody
  const signal = wb.currentSignal
  const noData = isNoDataSignal(signal)
  const score = signal && !noData ? signal.compositeScore : null

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <BackButton className="mb-4 md:hidden" />
      <section className="rounded-2xl bg-surface-container-low p-6 sm:p-8">
        <div className="flex flex-col-reverse items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {signal?.topSection && (
              <p className="font-label text-xs font-bold uppercase tracking-[0.2em] text-secondary">
                {signal.topSection}
              </p>
            )}
            <h1 className="mt-1 font-headline text-4xl italic text-primary">{wb.name}</h1>
            {wb.description && (
              <p className="mt-3 max-w-prose font-body text-on-surface-variant">
                {wb.description}
              </p>
            )}
            {wb.typicalSpecies.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {wb.typicalSpecies.map((s) => (
                  <SpeciesIcon key={s} name={s} />
                ))}
                <span className="font-label text-xs uppercase tracking-wider text-on-surface-variant">
                  {wb.typicalSpecies.join(' · ')}
                </span>
              </div>
            )}
          </div>
          {signal && <ScoreRing score={score} noData={noData} size="lg" />}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        {wb.latitude != null && wb.longitude != null && (
          <section
            aria-label={`Location map for ${wb.name}`}
            className="isolate overflow-hidden rounded-2xl bg-surface-container-low lg:col-start-2 lg:row-start-1"
          >
            <div className="h-44 w-full lg:h-full">
              <WaterBodyMiniMapIsland
                latitude={wb.latitude}
                longitude={wb.longitude}
                name={wb.name}
                slug={wb.slug}
                score={score}
              />
            </div>
          </section>
        )}

        <section className="lg:col-start-1 lg:row-start-1">
          <h2 className="mb-3 font-headline text-lg font-bold text-on-surface">Flow Data</h2>
          <GaugeStatus flow={wb.currentFlow} />
          <FlowChart readings={wb.gaugeReadings} />
        </section>

        {signal && (
          <section className="lg:col-start-2 lg:row-start-2">
            <h2 className="mb-3 font-headline text-lg font-bold text-on-surface">
              Signal Breakdown
            </h2>
            <ScoreBreakdown signal={signal} noData={noData} />
            {!noData && signal.summary && (
              <p className="mt-3 font-body text-sm text-on-surface-variant">
                {signal.summary}
              </p>
            )}
            {!noData && signal.recommendedFlies.length > 0 && (
              <div className="mt-4">
                <h3 className="font-label text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Recommended Flies
                </h3>
                <div className="mt-2 flex flex-wrap gap-1">
                  {signal.recommendedFlies.map((fly) => (
                    <Tag key={fly} variant="primary">
                      {fly}
                    </Tag>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        <section className="lg:col-start-1 lg:row-start-2">
          <h2 className="mb-4 font-headline text-lg font-bold text-on-surface">Recent Reports</h2>
          <ReportFeed reports={wb.recentReports} />
        </section>
      </div>
    </div>
  )
}
