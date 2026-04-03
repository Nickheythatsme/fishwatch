'use client'

import { gql, useQuery } from '@apollo/client'
import dynamic from 'next/dynamic'
import { SignalCard } from '@/components/signals/SignalCard'

const FishingMap = dynamic(() => import('@/components/map/FishingMap').then(m => m.FishingMap), {
  ssr: false,
  loading: () => <div className="h-[400px] animate-pulse rounded-lg bg-gray-200" />,
})

const DASHBOARD_QUERY = gql`
  query Dashboard {
    waterBodies {
      id
      name
      slug
      latitude
      longitude
      typicalSpecies
      currentSignal {
        compositeScore
        summary
        recommendedFlies
        recommendedSpecies
        scoreDate
      }
      currentFlow
    }
  }
`

export default function DashboardPage() {
  const { data, loading, error } = useQuery(DASHBOARD_QUERY)

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-[400px] rounded-lg bg-gray-200" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 rounded-lg bg-gray-200" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-red-600">Failed to load fishing data. Please try again.</p>
      </div>
    )
  }

  const waterBodies = data?.waterBodies ?? []

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Central Oregon Fishing Conditions</h1>

      <FishingMap waterBodies={waterBodies} />

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {waterBodies.map((wb: any) => (
          <SignalCard key={wb.id} waterBody={wb} />
        ))}
      </div>
    </div>
  )
}
