'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Compass } from 'lucide-react'
import { IntelligencePanel, type SortOption } from './IntelligencePanel'
import { LocalConditionsPanel, type RegionConditions } from './LocalConditionsPanel'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { sortWaterBodies, type DashboardWaterBody } from './dashboard-utils'

// `FishingMap` renders Leaflet, which only runs in the browser. The `ssr: false`
// dynamic import is allowed here because this is a Client Component. The map
// receives its data as props from the server-fetched list.
const FishingMap = dynamic(() => import('@/components/map/FishingMap').then((m) => m.FishingMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-surface-container-high" />,
})

interface DashboardViewProps {
  waterBodies: DashboardWaterBody[]
  region: string
  regionConditions: RegionConditions | null
  sortBy: SortOption
}

export function DashboardView({
  waterBodies,
  region,
  regionConditions,
  sortBy: initialSortBy,
}: DashboardViewProps) {
  const router = useRouter()

  // Initialised from the server-read `?sort` param so the client matches the
  // already-rendered HTML, then owned locally so re-sorting is instant (no
  // refetch). We still push the choice into the URL to keep it shareable.
  const [sortBy, setSortBy] = useState<SortOption>(initialSortBy)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const sortedWaterBodies = useMemo(
    () => sortWaterBodies(waterBodies, sortBy),
    [waterBodies, sortBy]
  )

  function handleSortChange(opt: SortOption) {
    setSortBy(opt)
    // 'signal' is the default ordering, so keep its URL clean.
    router.replace(opt === 'signal' ? '/' : `/?sort=${opt}`, { scroll: false })
  }

  const panel = (
    <IntelligencePanel
      waterBodies={sortedWaterBodies}
      region={region}
      sortBy={sortBy}
      onSortChange={handleSortChange}
      onHover={setHoveredId}
    />
  )

  // Topbar (~65px) shows on md+ only. Mobile bottom nav adds 64px padding to
  // <main> in layout. Height calc fills the remaining viewport precisely.
  return (
    <div className="flex h-[calc(100dvh-64px)] w-full md:h-[calc(100vh-65px)]">
      <aside id="intelligence" className="hidden w-96 shrink-0 overflow-hidden md:block">
        {panel}
      </aside>
      <div id="map" className="relative flex-1 overflow-hidden">
        <FishingMap waterBodies={waterBodies} hoveredId={hoveredId} />
        {region && <LocalConditionsPanel region={region} conditions={regionConditions} />}
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
