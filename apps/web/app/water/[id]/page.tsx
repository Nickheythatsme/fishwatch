'use client'

import { gql, useQuery } from '@apollo/client'
import { useParams } from 'next/navigation'
import { SignalBadge } from '@/components/signals/SignalBadge'
import { ScoreBreakdown } from '@/components/signals/ScoreBreakdown'
import { isNoDataSignal } from '@/components/signals/score-utils'
import { ReportFeed } from '@/components/reports/ReportFeed'
import { GaugeStatus } from '@/components/gauges/GaugeStatus'
import { FlowChart } from '@/components/gauges/FlowChart'

const WATER_BODY_QUERY = gql`
  query WaterBody($slug: String!) {
    waterBody(slug: $slug) {
      id
      name
      slug
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
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 rounded bg-gray-200" />
          <div className="h-48 rounded-lg bg-gray-200" />
        </div>
      </div>
    )
  }

  if (error || !data?.waterBody) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-red-600">Water body not found.</p>
      </div>
    )
  }

  const wb = data.waterBody

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{wb.name}</h1>
          <p className="mt-1 text-gray-600">{wb.description}</p>
          {wb.typicalSpecies.length > 0 && (
            <p className="mt-2 text-sm text-gray-500">
              Species: {wb.typicalSpecies.join(', ')}
            </p>
          )}
        </div>
        {wb.currentSignal && (
          <SignalBadge
            score={wb.currentSignal.compositeScore}
            noData={isNoDataSignal(wb.currentSignal)}
          />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-semibold">Flow Data</h2>
          <GaugeStatus flow={wb.currentFlow} />
          <FlowChart readings={wb.gaugeReadings} />
        </section>

        {wb.currentSignal && (
          <section>
            <h2 className="mb-3 text-lg font-semibold">Signal Breakdown</h2>
            <ScoreBreakdown
              signal={wb.currentSignal}
              noData={isNoDataSignal(wb.currentSignal)}
            />
            {!isNoDataSignal(wb.currentSignal) && wb.currentSignal.summary && (
              <p className="mt-3 text-sm text-gray-700">{wb.currentSignal.summary}</p>
            )}
            {!isNoDataSignal(wb.currentSignal) && wb.currentSignal.recommendedFlies.length > 0 && (
              <div className="mt-3">
                <h3 className="text-sm font-medium text-gray-600">Recommended Flies</h3>
                <div className="mt-1 flex flex-wrap gap-1">
                  {wb.currentSignal.recommendedFlies.map((fly: string) => (
                    <span
                      key={fly}
                      className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800"
                    >
                      {fly}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Recent Reports</h2>
        <ReportFeed reports={wb.recentReports} />
      </section>
    </div>
  )
}
