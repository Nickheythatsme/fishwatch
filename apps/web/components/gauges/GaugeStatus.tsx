export function GaugeStatus({ flow }: { flow: number | null | undefined }) {
  if (flow == null) {
    return (
      <div className="rounded-2xl bg-surface-container-lowest p-5">
        <p className="font-body text-sm text-on-surface-variant">No gauge data available.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-surface-container-lowest p-5">
      <p className="font-label text-xs font-bold uppercase tracking-wider text-on-surface-variant">
        Current Flow
      </p>
      <p className="mt-1 font-headline text-4xl font-bold text-primary">
        {Math.round(flow).toLocaleString()}
        <span className="ml-1 font-body text-base font-normal text-on-surface-variant">
          cfs
        </span>
      </p>
    </div>
  )
}
