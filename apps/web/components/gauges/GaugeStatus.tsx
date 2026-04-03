export function GaugeStatus({ flow }: { flow: number | null | undefined }) {
  if (flow == null) {
    return <p className="text-sm text-gray-500">No gauge data available.</p>
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-sm text-gray-500">Current Flow</p>
      <p className="text-3xl font-bold">{flow.toLocaleString()} <span className="text-base font-normal text-gray-500">cfs</span></p>
    </div>
  )
}
