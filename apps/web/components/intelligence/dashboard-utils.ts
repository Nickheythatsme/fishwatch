import { isNoDataSignal } from '@/components/signals/score-utils'
import type { IntelligenceCardWaterBody } from './IntelligenceCard'
import type { SortOption } from './IntelligencePanel'

// The sort options the homepage understands. Used both server-side (to read the
// `?sort` param and produce correctly ordered initial HTML) and client-side (to
// re-order instantly without a refetch).
export const VALID_SORTS: SortOption[] = ['signal', 'name', 'updated', 'flow']

// The homepage `DASHBOARD_QUERY` shape: an intelligence card plus the extra
// fields the map and the sort logic need (region, coordinates, scoreDate).
export interface DashboardWaterBody extends IntelligenceCardWaterBody {
  region: string
  latitude: number
  longitude: number
  currentSignal:
    | (IntelligenceCardWaterBody['currentSignal'] & { scoreDate: string | null })
    | null
}

export function sortWaterBodies(
  waterBodies: DashboardWaterBody[],
  sortBy: SortOption
): DashboardWaterBody[] {
  return [...waterBodies].sort((a, b) => {
    switch (sortBy) {
      case 'signal': {
        const aNoData = !a.currentSignal || isNoDataSignal(a.currentSignal)
        const bNoData = !b.currentSignal || isNoDataSignal(b.currentSignal)
        if (aNoData && !bNoData) return 1
        if (!aNoData && bNoData) return -1
        if (aNoData && bNoData) return a.name.localeCompare(b.name)
        return b.currentSignal!.compositeScore - a.currentSignal!.compositeScore
      }
      case 'name':
        return a.name.localeCompare(b.name)
      case 'updated': {
        const aDate = a.currentSignal?.scoreDate ?? ''
        const bDate = b.currentSignal?.scoreDate ?? ''
        if (!aDate && bDate) return 1
        if (aDate && !bDate) return -1
        if (aDate !== bDate) return bDate.localeCompare(aDate)
        return a.name.localeCompare(b.name)
      }
      case 'flow': {
        const aFlow = a.currentFlow ?? -1
        const bFlow = b.currentFlow ?? -1
        if (aFlow < 0 && bFlow >= 0) return 1
        if (aFlow >= 0 && bFlow < 0) return -1
        if (aFlow !== bFlow) return bFlow - aFlow
        return a.name.localeCompare(b.name)
      }
      default:
        return 0
    }
  })
}

export function pickRegion(waterBodies: DashboardWaterBody[]): string {
  const counts = new Map<string, number>()
  waterBodies.forEach((wb) => {
    counts.set(wb.region, (counts.get(wb.region) ?? 0) + 1)
  })
  let best = 'Pacific Northwest'
  let bestCount = 0
  counts.forEach((count, region) => {
    if (count > bestCount) {
      best = region
      bestCount = count
    }
  })
  return best
}
