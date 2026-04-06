'use client'

import { useMemo } from 'react'
import { Marker, Popup, Tooltip } from 'react-leaflet'
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

function createIcon(color: string, size: number) {
  return L.divIcon({
    className: 'custom-pin',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,${size > 20 ? 0.4 : 0.3});transition:all 0.15s ease"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

const PIN_SIZE = 20
const HIGHLIGHTED_PIN_SIZE = 28
const HIGHLIGHT_Z_OFFSET = 1000

interface WaterPinProps {
  waterBody: WaterBodyPin
  highlighted?: boolean
}

export function WaterPin({ waterBody, highlighted }: WaterPinProps) {
  const score = waterBody.currentSignal?.compositeScore
  const color = scoreToColor(score)
  const size = highlighted ? HIGHLIGHTED_PIN_SIZE : PIN_SIZE

  const icon = useMemo(() => createIcon(color, size), [color, size])

  return (
    <Marker
      position={[waterBody.latitude, waterBody.longitude]}
      icon={icon}
      zIndexOffset={highlighted ? HIGHLIGHT_Z_OFFSET : 0}
    >
      {highlighted && (
        <Tooltip direction="top" offset={[0, -size / 2]} permanent>
          {waterBody.name}
        </Tooltip>
      )}
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
