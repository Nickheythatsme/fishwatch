'use client'

interface GaugeReading {
  measuredAt: string
  flowCfs: number | null
}

export function FlowChart({ readings }: { readings: GaugeReading[] }) {
  const validReadings = readings
    .filter((r) => r.flowCfs != null)
    .sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime())

  if (validReadings.length === 0) {
    return <p className="text-sm text-gray-500">No flow data available.</p>
  }

  const flows = validReadings.map((r) => r.flowCfs!)
  const max = Math.max(...flows)
  const min = Math.min(...flows)
  const range = max - min || 1

  const width = 600
  const height = 120
  const padding = 4

  const points = validReadings
    .map((r, i) => {
      const x = padding + (i / (validReadings.length - 1 || 1)) * (width - padding * 2)
      const y = height - padding - ((r.flowCfs! - min) / range) * (height - padding * 2)
      return `${x},${y}`
    })
    .join(' ')

  return (
    <div className="mt-3 rounded-lg border bg-white p-4">
      <div className="flex justify-between text-xs text-gray-400">
        <span>{new Date(validReadings[0].measuredAt).toLocaleDateString()}</span>
        <span>{new Date(validReadings[validReadings.length - 1].measuredAt).toLocaleDateString()}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          points={points}
        />
      </svg>
      <div className="flex justify-between text-xs text-gray-400">
        <span>{min.toLocaleString()} cfs</span>
        <span>{max.toLocaleString()} cfs</span>
      </div>
    </div>
  )
}
