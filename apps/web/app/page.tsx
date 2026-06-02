'use client'

import { Suspense, useMemo, useState } from 'react'
import { gql, useQuery } from '@apollo/client'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Compass } from 'lucide-react'
import {
  IntelligencePanel,
  type SortOption,
} from '@/components/intelligence/IntelligencePanel'
import type { IntelligenceCardWaterBody } from '@/components/intelligence/IntelligenceCard'
import { LocalConditionsPanel } from '@/components/intelligence/LocalConditionsPanel'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { isNoDataSignal } from '@/components/signals/score-utils'

const FishingMap = dynamic(() => import('@/components/map/FishingMap').then(m => m.FishingMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-surface-container-high" />,
})

const DASHBOARD_QUERY = gql`
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
    }
  }
`

const VALID_SORTS: SortOption[] = ['signal', 'name', 'updated', 'flow']

interface DashboardWaterBody extends IntelligenceCardWaterBody {
  region: string
  latitude: number
  longitude: number
  currentSignal:
    | (IntelligenceCardWaterBody['currentSignal'] & { scoreDate: string })
    | null
}

function sortWaterBodies(waterBodies: DashboardWaterBody[], sortBy: SortOption): DashboardWaterBody[] {
  return [...waterBodies].sort((a, b) => {
    switch (sortBy) {
      case 'signal': {
        const aNoData = !a.currentSignal || isNoDataSignal(a.currentSignal)
        const bNoData = !b.currentSignal || isNoDataSignal(b.currentSignal)
        if (aNoData && !bNoData) return 1
        if (!aNoData && bNoData) return -1
        if (aNoData && bNoData) return a.name.localeCompare(b.name)
        return b.currentSignal!.compositeScore - a.currentSignal!.compositeScore
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

function pickRegion(waterBodies: DashboardWaterBody[]): string {
  const counts = new Map<string, number>()
  waterBodies.forEach((wb) => {
    counts.set(wb.region, (counts.get(wb.region) ?? 0) + 1)
  })
  let best = 'Central Oregon'
  let bestCount = 0
  counts.forEach((count, region) => {
    if (count > bestCount) {
      best = region
      bestCount = count
    }
  })
  return best
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  )
}

function DashboardContent() {
  const { data, loading, error } = useQuery(DASHBOARD_QUERY)
  const searchParams = useSearchParams()
  const router = useRouter()

  const rawSort = searchParams.get('sort')
  const sortBy: SortOption = VALID_SORTS.includes(rawSort as SortOption)
    ? (rawSort as SortOption)
    : 'signal'

  function setSortBy(opt: SortOption) {
    const params = new URLSearchParams(searchParams.toString())
    if (opt === 'signal') {
      params.delete('sort')
    } else {
      params.set('sort', opt)
    }
    const qs = params.toString()
    router.replace(qs ? `/?${qs}` : '/', { scroll: false })
  }

  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const waterBodies: DashboardWaterBody[] = useMemo(
    () => data?.waterBodies ?? [],
    [data]
  )
  const sortedWaterBodies = useMemo(
    () => sortWaterBodies(waterBodies, sortBy),
    [waterBodies, sortBy]
  )
  const region = useMemo(() => pickRegion(waterBodies), [waterBodies])

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <p className="rounded-2xl bg-error-container/30 p-6 text-error">
          Failed to load fishing data. Please try again.
        </p>
      </div>
    )
  }

  const panel = (
    <IntelligencePanel
      waterBodies={sortedWaterBodies}
      region={region}
      sortBy={sortBy}
      onSortChange={setSortBy}
      onHover={setHoveredId}
    />
  )

  // Topbar (~65px) shows on md+ only. Mobile bottom nav adds 64px padding to
  // <main> in layout. Height calc fills the remaining viewport precisely.
  return (
    <div className="flex h-[calc(100dvh-64px)] w-full md:h-[calc(100vh-65px)]">
      <aside id="intelligence" className="hidden w-96 shrink-0 md:flex">
        {panel}
      </aside>
      <div id="map" className="relative flex-1">
        {loading && !data ? (
          <div className="h-full w-full animate-pulse bg-surface-container-high" />
        ) : (
          <FishingMap waterBodies={waterBodies} hoveredId={hoveredId} />
        )}
        {region && <LocalConditionsPanel region={region} />}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="absolute bottom-4 left-1/2 z-[400] flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary-container px-5 py-3 font-label text-sm font-semibold text-on-primary shadow-lg md:hidden"
        >
          <Compass className="h-4 w-4" />
          View Intelligence
        </button>
      </div>
      <BottomSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Intelligence">
        {panel}
      </BottomSheet>
    </div>
  )
}
