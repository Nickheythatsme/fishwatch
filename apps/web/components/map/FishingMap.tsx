'use client'

import { MapContainer, TileLayer } from 'react-leaflet'
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

export function FishingMap({ waterBodies, hoveredId }: FishingMapProps) {
  return (
    <MapContainer
      center={[44.05, -121.3]}
      zoom={8}
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
