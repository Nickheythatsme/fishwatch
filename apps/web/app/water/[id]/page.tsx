'use client'

import { gql, useQuery } from '@apollo/client'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { Tag } from '@/components/ui/Tag'
import { SpeciesIcon } from '@/components/ui/SpeciesIcon'
import { ScoreBreakdown } from '@/components/signals/ScoreBreakdown'
import { isNoDataSignal } from '@/components/signals/score-utils'
import { ReportFeed } from '@/components/reports/ReportFeed'
import { GaugeStatus } from '@/components/gauges/GaugeStatus'
import { FlowChart } from '@/components/gauges/FlowChart'

const WaterBodyMiniMap = dynamic(
  () => import('@/components/map/WaterBodyMiniMap').then((m) => m.WaterBodyMiniMap),
  {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse bg-surface-container-high" />,
  }
)

const WATER_BODY_QUERY = gql`
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

export default function WaterBodyPage() {
  const params = useParams()
  const slug = params.id as string

  const { data, loading, error } = useQuery(WATER_BODY_QUERY, {
    variables: { slug },
  })

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-32 rounded-2xl bg-surface-container-high" />
          <div className="h-48 rounded-2xl bg-surface-container-high" />
        </div>
      </div>
    )
  }

  if (error || !data?.waterBody) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="rounded-2xl bg-error-container/30 p-6 text-error">
          Water body not found.
        </p>
      </div>
    )
  }

  const wb = data.waterBody
  const signal = wb.currentSignal
  const noData = isNoDataSignal(signal)
  const score = signal && !noData ? signal.compositeScore : null

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
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
                {wb.typicalSpecies.map((s: string) => (
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
              <WaterBodyMiniMap
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
                  {signal.recommendedFlies.map((fly: string) => (
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
