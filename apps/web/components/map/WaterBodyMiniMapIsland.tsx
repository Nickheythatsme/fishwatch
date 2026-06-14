'use client'

import dynamic from 'next/dynamic'

// `WaterBodyMiniMap` renders Leaflet, which only runs in the browser. `next/dynamic`
// with `ssr: false` is only allowed inside a Client Component, so this thin
// 'use client' wrapper lets the server-rendered water page mount the map as a
// client island while passing it server-fetched data as props.
const WaterBodyMiniMap = dynamic(
  () => import('@/components/map/WaterBodyMiniMap').then((m) => m.WaterBodyMiniMap),
  {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse bg-surface-container-high" />,
  }
)

interface WaterBodyMiniMapIslandProps {
  latitude: number
  longitude: number
  name: string
  slug: string
  score?: number | null
}

export function WaterBodyMiniMapIsland(props: WaterBodyMiniMapIslandProps) {
  return <WaterBodyMiniMap {...props} />
}
