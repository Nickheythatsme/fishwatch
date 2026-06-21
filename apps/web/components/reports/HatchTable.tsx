import { getHatchIcon } from '@/components/ui/icons'

// Matches the GraphQL `Hatch` type (apps/web/lib/graphql/schema.ts) and the
// `parsed_reports.hatches` JSONB shape (packages/db/types.ts).
export interface Hatch {
  name: string
  stage: string | null
  timing: string | null
}

interface HatchSource {
  hatches: Hatch[]
}

// Aggregate hatches across recent reports into one deduped row per insect.
// Reports arrive most-recent-first (the `recentReports` resolver orders by
// `report_date` descending), so the first time we see an insect name we keep
// that report's stage/timing — i.e. the freshest observation wins.
function dedupeHatches(reports: HatchSource[]): Hatch[] {
  const byName = new Map<string, Hatch>()
  for (const report of reports) {
    for (const hatch of report.hatches) {
      const name = hatch.name?.trim()
      if (!name) continue
      const key = name.toLowerCase()
      if (!byName.has(key)) {
        byName.set(key, { name, stage: hatch.stage, timing: hatch.timing })
      }
    }
  }
  return Array.from(byName.values())
}

export function HatchTable({ reports }: { reports: HatchSource[] }) {
  const hatches = dedupeHatches(reports)

  // Empty-hatch waters render nothing — no empty table or placeholder section.
  if (hatches.length === 0) return null

  return (
    <section aria-labelledby="hatch-heading">
      <h2
        id="hatch-heading"
        className="mb-3 font-headline text-lg font-bold text-on-surface"
      >
        What&apos;s Hatching
      </h2>
      <div className="overflow-hidden rounded-2xl bg-surface-container-lowest">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-outline-variant">
              <th className="px-4 py-2 font-label text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Insect
              </th>
              <th className="px-4 py-2 font-label text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Stage
              </th>
              <th className="px-4 py-2 font-label text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Timing
              </th>
            </tr>
          </thead>
          <tbody>
            {hatches.map((hatch) => {
              const Icon = getHatchIcon(hatch.name)
              return (
                <tr
                  key={hatch.name.toLowerCase()}
                  className="border-b border-outline-variant last:border-b-0"
                >
                  <td className="px-4 py-2.5 font-body text-sm text-on-surface">
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0 text-on-surface-variant" aria-hidden />
                      <span className="capitalize">{hatch.name}</span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-body text-sm capitalize text-on-surface-variant">
                    {hatch.stage ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 font-body text-sm text-on-surface-variant">
                    {hatch.timing ?? '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
