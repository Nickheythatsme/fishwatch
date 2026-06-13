'use client'

import { MapContainer, TileLayer } from 'react-leaflet'
import { WaterPin } from './WaterPin'
import 'leaflet/dist/leaflet.css'

interface WaterBodyMiniMapProps {
  latitude: number
  longitude: number
  name: string
  slug: string
  score?: number | null
}

const MINI_ZOOM = 11

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_API_KEY
const MAPBOX_STYLE_ID = process.env.NEXT_PUBLIC_MAPBOX_STYLE_ID || 'outdoors-v12'

export function WaterBodyMiniMap({
  latitude,
  longitude,
  name,
  slug,
  score,
}: WaterBodyMiniMapProps) {
  const useMapbox = Boolean(MAPBOX_TOKEN)
  const pin = {
    id: slug,
    name,
    slug,
    latitude,
    longitude,
    currentSignal: score != null ? { compositeScore: score } : null,
  }

  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={MINI_ZOOM}
      className="h-full w-full"
      zoomControl={false}
      scrollWheelZoom={false}
      dragging={false}
      doubleClickZoom={false}
      touchZoom={false}
      boxZoom={false}
      keyboard={false}
    >
      {useMapbox ? (
        <TileLayer
          attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={`https://api.mapbox.com/styles/v1/mapbox/${MAPBOX_STYLE_ID}/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`}
          tileSize={512}
          zoomOffset={-1}
        />
      ) : (
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      )}
      <WaterPin waterBody={pin} interactive={false} />
    </MapContainer>
  )
}
