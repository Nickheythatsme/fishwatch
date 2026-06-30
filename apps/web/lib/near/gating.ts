import { TOWNS, MAX_NEAR_DISTANCE_MILES, type Town } from './towns'
import { haversineDistanceMiles } from './haversine'
import { isPublishable, type GatingInput } from '@/lib/seo/gating'

/**
 * Minimal water shape needed to gate `/near/[town]` linkability — mirrors the
 * fields `app/sitemap.ts` already uses to decide whether a town's near page is
 * indexable, so contextual links never point at a noindex near page (issue #147).
 */
export interface NearGatingWater {
  latitude: number | null
  longitude: number | null
  currentSignal: GatingInput['signal']
  recentReports: Array<{ reportDate: string | null }>
}

/** Default cap for "near this town" contextual link blocks on the basin page. */
export const MAX_RELATED_NEAR_TOWNS = 2

function isNearWater(town: Town, w: NearGatingWater): boolean {
  if (w.latitude == null || w.longitude == null) return false
  return haversineDistanceMiles(town.lat, town.lon, w.latitude, w.longitude) <= MAX_NEAR_DISTANCE_MILES
}

/**
 * True when at least one publishable water lies within `MAX_NEAR_DISTANCE_MILES`
 * of `town` — the same condition that keeps `/near/[town]` indexable
 * (`generateMetadata` + `app/sitemap.ts`). A town that fails this has a noindex
 * near page and must never be linked.
 */
export function isTownPublishable(town: Town, waters: NearGatingWater[]): boolean {
  return waters.some((w) => isNearWater(town, w) && isPublishable({
    signal: w.currentSignal,
    latestReportDate: w.recentReports[0]?.reportDate ?? null,
  }))
}

/** All curated towns whose near page is currently publishable, in `TOWNS` order. */
export function publishableTowns(waters: NearGatingWater[]): Town[] {
  return TOWNS.filter((t) => isTownPublishable(t, waters))
}

/**
 * Nearest publishable town to a point (e.g. a water body's coordinates),
 * within `MAX_NEAR_DISTANCE_MILES`. Returns null when no curated town both
 * covers the point and is itself publishable.
 */
export function nearestPublishableTown(
  lat: number,
  lon: number,
  waters: NearGatingWater[]
): Town | null {
  let best: { town: Town; distance: number } | null = null
  for (const town of TOWNS) {
    const distance = haversineDistanceMiles(lat, lon, town.lat, town.lon)
    if (distance > MAX_NEAR_DISTANCE_MILES) continue
    if (!isTownPublishable(town, waters)) continue
    if (best == null || distance < best.distance) best = { town, distance }
  }
  return best?.town ?? null
}

/**
 * Towns relevant to a basin: the basin has at least one water within range of
 * the town AND the town's near page is publishable (checked against the full
 * `allWaters` list, not just the basin's — a town's publishability depends on
 * every water near it, not only this basin's members). Capped to `limit`, in
 * `TOWNS` order.
 */
export function relevantPublishableTowns(
  basinWaters: NearGatingWater[],
  allWaters: NearGatingWater[],
  limit: number = MAX_RELATED_NEAR_TOWNS
): Town[] {
  const result: Town[] = []
  for (const town of TOWNS) {
    if (result.length >= limit) break
    if (!basinWaters.some((w) => isNearWater(town, w))) continue
    if (!isTownPublishable(town, allWaters)) continue
    result.push(town)
  }
  return result
}
