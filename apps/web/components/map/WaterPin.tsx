'use client'

import { useMemo } from 'react'
import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { scoreToTone, TONE_HEX } from '@/components/signals/score-utils'

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

const DOT = 14
const DOT_HIGHLIGHTED = 18
const CHIP_HEIGHT = 18
const GAP = 4

function createIcon(color: string, dot: number, label: string): L.DivIcon {
  const totalHeight = dot + GAP + CHIP_HEIGHT
  const width = Math.max(dot, 38)
  return L.divIcon({
    className: 'scorefish-pin',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;line-height:1">
        <div style="width:${dot}px;height:${dot}px;border-radius:9999px;background:${color};border:2px solid #ffffff;box-shadow:0 1px 4px rgba(0,0,0,0.35)"></div>
        <div style="margin-top:${GAP}px;padding:2px 6px;border-radius:6px;background:rgba(248,250,249,0.9);backdrop-filter:blur(8px);color:${color};font-family:var(--font-body),sans-serif;font-size:10px;font-weight:700;letter-spacing:0.02em;box-shadow:0 1px 3px rgba(0,0,0,0.18)">${label}</div>
      </div>
    `,
    iconSize: [width, totalHeight],
    iconAnchor: [width / 2, dot / 2],
  })
}

interface WaterPinProps {
  waterBody: WaterBodyPin
  highlighted?: boolean
  /** When false, renders a purely visual marker with no popup or click target. Defaults to true. */
  interactive?: boolean
}

export function WaterPin({ waterBody, highlighted, interactive = true }: WaterPinProps) {
  const score = waterBody.currentSignal?.compositeScore ?? null
  const tone = scoreToTone(score)
  const color = TONE_HEX[tone]
  const dot = highlighted ? DOT_HIGHLIGHTED : DOT
  const label = score == null ? '–' : score.toFixed(1)

  const icon = useMemo(() => createIcon(color, dot, label), [color, dot, label])

  return (
    <Marker
      position={[waterBody.latitude, waterBody.longitude]}
      icon={icon}
      zIndexOffset={highlighted ? 1000 : 0}
      interactive={interactive}
      keyboard={interactive}
    >
      {interactive && (
        <Popup>
          <div className="font-body text-sm">
            <a href={`/water/${waterBody.slug}`} className="font-headline italic text-primary">
              {waterBody.name}
            </a>
            {score != null && (
              <p className="mt-1 text-on-surface-variant">Signal: {score.toFixed(1)} / 10</p>
            )}
          </div>
        </Popup>
      )}
    </Marker>
  )
}
