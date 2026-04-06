'use client'

import { useState, useMemo } from 'react'
import { gql, useQuery } from '@apollo/client'
import dynamic from 'next/dynamic'
import { SignalCard } from '@/components/signals/SignalCard'
import { isNoDataSignal } from '@/components/signals/score-utils'

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
        flowScore
        sentimentScore
        consensusScore
        summary
        recommendedFlies
        recommendedSpecies
        scoreDate
      }
      currentFlow
    }
  }
`

type SortOption = 'signal' | 'name' | 'updated' | 'flow'

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'signal', label: 'Best Signal' },
  { key: 'name', label: 'Name' },
  { key: 'updated', label: 'Recently Updated' },
  { key: 'flow', label: 'Current Flow' },
]

function sortWaterBodies(waterBodies: any[], sortBy: SortOption): any[] {
  return [...waterBodies].sort((a, b) => {
    switch (sortBy) {
      case 'signal': {
        const aNoData = !a.currentSignal || isNoDataSignal(a.currentSignal)
        const bNoData = !b.currentSignal || isNoDataSignal(b.currentSignal)
        if (aNoData && !bNoData) return 1
        if (!aNoData && bNoData) return -1
        if (aNoData && bNoData) return a.name.localeCompare(b.name)
        return b.currentSignal.compositeScore - a.currentSignal.compositeScore
      }
      case 'name':
        return a.name.localeCompare(b.name)
      case 'updated': {
        const aDate = a.currentSignal?.scoreDate ?? ''
        const bDate = b.currentSignal?.scoreDate ?? ''
        if (!aDate && bDate) return 1
        if (aDate && !bDate) return -1
        if (aDate !== bDate) return bDate.localeCompare(aDate)
        return a.name.localeCompare(b.name)
      }
      case 'flow': {
        const aFlow = a.currentFlow ?? -1
        const bFlow = b.currentFlow ?? -1
        if (aFlow < 0 && bFlow >= 0) return 1
        if (aFlow >= 0 && bFlow < 0) return -1
        if (aFlow !== bFlow) return bFlow - aFlow
        return a.name.localeCompare(b.name)
      }
      default:
        return 0
    }
  })
}

export default function DashboardPage() {
  const { data, loading, error } = useQuery(DASHBOARD_QUERY)
  const [sortBy, setSortBy] = useState<SortOption>('signal')

  const waterBodies = data?.waterBodies ?? []
  const sortedWaterBodies = useMemo(
    () => sortWaterBodies(waterBodies, sortBy),
    [waterBodies, sortBy]
  )

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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Central Oregon Fishing Conditions</h1>

      <FishingMap waterBodies={waterBodies} />

      <div className="mt-8 flex items-center gap-2">
        <span className="text-sm font-medium text-gray-500">Sort:</span>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSortBy(opt.key)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              sortBy === opt.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedWaterBodies.map((wb: any) => (
          <SignalCard key={wb.id} waterBody={wb} />
        ))}
      </div>
    </div>
  )
}
