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
    return (
      <div className="mt-3 rounded-2xl bg-surface-container-lowest p-5">
        <p className="font-body text-sm text-on-surface-variant">No flow data available.</p>
      </div>
    )
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
    <div className="mt-3 rounded-2xl bg-surface-container-lowest p-5">
      <div className="flex justify-between font-label text-xs text-on-surface-variant">
        <span>{new Date(validReadings[0].measuredAt).toLocaleDateString()}</span>
        <span>
          {new Date(validReadings[validReadings.length - 1].measuredAt).toLocaleDateString()}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="my-2 w-full text-primary"
        preserveAspectRatio="none"
      >
        <polyline fill="none" stroke="currentColor" strokeWidth="2" points={points} />
      </svg>
      <div className="flex justify-between font-label text-xs text-on-surface-variant">
        <span>{min.toLocaleString()} cfs</span>
        <span>{max.toLocaleString()} cfs</span>
      </div>
    </div>
  )
}
