import { haversineDistanceMiles } from './haversine'
import { MAX_NEAR_DISTANCE_MILES, type Town } from './towns'
import { isNoDataSignal } from '@/components/signals/score-utils'

export interface MinimalRankableWater {
  latitude: number | null
  longitude: number | null
  currentSignal: {
    compositeScore: number
    flowScore?: number | null
    sentimentScore?: number | null
    consensusScore?: number | null
  } | null
}

/**
 * Filter to waters within MAX_NEAR_DISTANCE_MILES of the town and sort by a
 * blended score: 60% fishing quality, 40% proximity (30-mile half-distance).
 *
 * Waters with no signal or a no-data sentinel score 0 for quality but are still
 * ranked by proximity — anglers nearby can decide for themselves.
 */
export function rankWatersNear<T extends MinimalRankableWater>(
  waters: T[],
  town: Town
): Array<T & { distanceMiles: number; rankScore: number }> {
  const results: Array<T & { distanceMiles: number; rankScore: number }> = []

  for (const w of waters) {
    if (w.latitude == null || w.longitude == null) continue
    const distanceMiles = haversineDistanceMiles(
      town.lat,
      town.lon,
      w.latitude,
      w.longitude
    )
    if (distanceMiles > MAX_NEAR_DISTANCE_MILES) continue

    const qualityScore =
      w.currentSignal != null && !isNoDataSignal(w.currentSignal)
        ? w.currentSignal.compositeScore / 10
        : 0
    const proximityScore = 1 / (1 + distanceMiles / 30)
    const rankScore = 0.6 * qualityScore + 0.4 * proximityScore

    results.push(
      { ...w, distanceMiles, rankScore } as unknown as T & {
        distanceMiles: number
        rankScore: number
      }
    )
  }

  return results.sort((a, b) => b.rankScore - a.rankScore)
}
