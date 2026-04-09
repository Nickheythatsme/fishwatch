'use client'

import { useMemo } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import { WaterPin } from './WaterPin'
import 'leaflet/dist/leaflet.css'

interface WaterBodyPin {
  id: string
  name: string
  slug: string
  latitude: number
  longitude: number
  currentSignal?: {
    compositeScore: number
  } | null
}

interface FishingMapProps {
  waterBodies: WaterBodyPin[]
  hoveredId?: string | null
}

const DEFAULT_CENTER: L.LatLngTuple = [44.05, -121.3]
const DEFAULT_ZOOM = 8
const BOUNDS_PADDING: L.FitBoundsOptions = { padding: [30, 30] }

export function FishingMap({ waterBodies, hoveredId }: FishingMapProps) {
  const bounds = useMemo(() => {
    if (waterBodies.length === 0) return null
    return L.latLngBounds(
      waterBodies.map((wb) => [wb.latitude, wb.longitude] as L.LatLngTuple)
    )
  }, [waterBodies])

  return (
    <MapContainer
      {...(bounds
        ? { bounds, boundsOptions: BOUNDS_PADDING }
        : { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM })}
      className="h-[400px] w-full rounded-lg"
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {waterBodies.map((wb) => (
        <WaterPin key={wb.id} waterBody={wb} highlighted={wb.id === hoveredId} />
      ))}
    </MapContainer>
  )
}
