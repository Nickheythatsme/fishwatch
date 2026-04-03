'use client'

import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'

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

function scoreToColor(score: number | undefined | null): string {
  if (score == null) return '#9ca3af' // gray
  if (score >= 8) return '#22c55e' // green
  if (score >= 6) return '#eab308' // yellow
  if (score >= 4) return '#f97316' // orange
  return '#ef4444' // red
}

function createIcon(color: string) {
  return L.divIcon({
    className: 'custom-pin',
    html: `<div style="width:20px;height:20px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

export function WaterPin({ waterBody }: { waterBody: WaterBodyPin }) {
  const score = waterBody.currentSignal?.compositeScore
  const color = scoreToColor(score)

  return (
    <Marker
      position={[waterBody.latitude, waterBody.longitude]}
      icon={createIcon(color)}
    >
      <Popup>
        <div className="text-sm">
          <a href={`/water/${waterBody.slug}`} className="font-semibold text-blue-700">
            {waterBody.name}
          </a>
          {score != null && (
            <p className="mt-1">Score: {score.toFixed(1)}/10</p>
          )}
        </div>
      </Popup>
    </Marker>
  )
}
