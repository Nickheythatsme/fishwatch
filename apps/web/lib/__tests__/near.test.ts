import { describe, it, expect } from 'vitest'
import { haversineDistanceMiles } from '@/lib/near/haversine'
import { rankWatersNear } from '@/lib/near/rank'
import { TOWNS, MAX_NEAR_DISTANCE_MILES } from '@/lib/near/towns'
import {
  isTownPublishable,
  publishableTowns,
  nearestPublishableTown,
  relevantPublishableTowns,
  type NearGatingWater,
} from '@/lib/near/gating'
import { isPublishable } from '@/lib/seo/gating'

const bend = TOWNS.find((t) => t.slug === 'bend-or')!

// isNoDataSignal returns true for compositeScore===5.0 with all null sub-scores.
// Any other compositeScore with null sub-scores is a real signal for ranking.
function makeWater(
  id: string,
  lat: number | null,
  lon: number | null,
  score: number | null
) {
  return {
    id,
    name: `Water ${id}`,
    slug: `water-${id}`,
    latitude: lat,
    longitude: lon,
    typicalSpecies: [] as string[],
    currentFlow: null as number | null,
    basin: null as { name: string; slug: string } | null,
    currentSignal:
      score != null
        ? {
            compositeScore: score,
            flowScore: null as number | null,
            sentimentScore: null as number | null,
            consensusScore: null as number | null,
            topSection: null as string | null,
          }
        : null,
    recentReports: [] as Array<{ reportDate: string | null }>,
  }
}

// ---------------------------------------------------------------------------
// haversineDistanceMiles
// ---------------------------------------------------------------------------

describe('haversineDistanceMiles', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineDistanceMiles(44.0, -121.0, 44.0, -121.0)).toBe(0)
  })

  it('Bend to Sisters is roughly 20 miles', () => {
    // Bend: 44.0582, -121.3153 | Sisters: 44.2901, -121.5493
    const d = haversineDistanceMiles(44.0582, -121.3153, 44.2901, -121.5493)
    expect(d).toBeGreaterThan(17)
    expect(d).toBeLessThan(23)
  })

  it('is symmetric', () => {
    const d1 = haversineDistanceMiles(44.0, -121.0, 45.0, -122.0)
    const d2 = haversineDistanceMiles(45.0, -122.0, 44.0, -121.0)
    expect(d1).toBeCloseTo(d2, 5)
  })

  it('Bend to Portland is roughly 120 miles (great-circle, not driving distance)', () => {
    // Great-circle distance is ~121 mi; the ~160 mi figure often cited is the
    // road distance around the Cascades, not the straight-line distance.
    const d = haversineDistanceMiles(44.0582, -121.3153, 45.5231, -122.6765)
    expect(d).toBeGreaterThan(110)
    expect(d).toBeLessThan(135)
  })
})

// ---------------------------------------------------------------------------
// rankWatersNear
// ---------------------------------------------------------------------------

describe('rankWatersNear', () => {
  it('excludes waters beyond MAX_NEAR_DISTANCE_MILES', () => {
    // Miami is ~2700 miles from Bend
    const far = makeWater('far', 25.7617, -80.1918, 9.0)
    expect(rankWatersNear([far], bend)).toHaveLength(0)
  })

  it('includes waters within MAX_NEAR_DISTANCE_MILES', () => {
    // A point ~5 miles from Bend
    const near = makeWater('near', 44.0582, -121.25, 8.0)
    expect(rankWatersNear([near], bend)).toHaveLength(1)
  })

  it('excludes waters with null coordinates', () => {
    const noCoords = makeWater('nocoords', null, null, 8.0)
    expect(rankWatersNear([noCoords], bend)).toHaveLength(0)
  })

  it('ranks closer water above farther water with equal score', () => {
    const close = makeWater('close', 44.08, -121.3, 7.0)  // ~2 mi from Bend
    const far = makeWater('far2', 44.9, -121.3, 7.0)       // ~57 mi from Bend
    const result = rankWatersNear([far, close], bend)
    expect(result[0].slug).toBe('water-close')
  })

  it('ranks quality water over closer no-signal water (60/40 blend)', () => {
    // Close water with no signal scores 0 quality + high proximity
    const close = makeWater('close', 44.06, -121.31, null) // ~1 mi, no signal
    // Farther water with high score: quality dominates
    const quality = makeWater('quality', 44.4, -121.5, 9.0) // ~25 mi, score=9
    const result = rankWatersNear([close, quality], bend)
    // close rankScore ≈ 0.4 * (1/(1+1/30)) = 0.4 * 0.97 ≈ 0.39
    // quality rankScore ≈ 0.6*0.9 + 0.4*(1/(1+25/30)) = 0.54 + 0.4*0.545 ≈ 0.76
    expect(result[0].slug).toBe('water-quality')
  })

  it('attaches distanceMiles and rankScore to each result', () => {
    const w = makeWater('w', 44.06, -121.31, 8.0)
    const result = rankWatersNear([w], bend)
    expect(result[0].distanceMiles).toBeGreaterThanOrEqual(0)
    expect(result[0].rankScore).toBeGreaterThan(0)
    expect(result[0].rankScore).toBeLessThanOrEqual(1)
  })

  it('preserves all original water fields in the result', () => {
    const w = makeWater('w', 44.06, -121.31, 8.0)
    const result = rankWatersNear([w], bend)
    expect(result[0].id).toBe('w')
    expect(result[0].name).toBe('Water w')
    expect(result[0].slug).toBe('water-w')
  })
})

// ---------------------------------------------------------------------------
// Near page gating (isPublishable applied to near context)
// ---------------------------------------------------------------------------

describe('near page gating', () => {
  const freshDate = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 3)
    return d.toISOString().split('T')[0]
  })()

  const staleDate = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })()

  it('a water with a real signal and a fresh report is publishable', () => {
    expect(
      isPublishable({
        signal: { compositeScore: 7.5, flowScore: 3.0, sentimentScore: 6.0, consensusScore: 5.0 },
        latestReportDate: freshDate,
      })
    ).toBe(true)
  })

  it('a no-data sentinel (score=5, all subs null) is not publishable', () => {
    expect(
      isPublishable({
        signal: { compositeScore: 5.0, flowScore: null, sentimentScore: null, consensusScore: null },
        latestReportDate: freshDate,
      })
    ).toBe(false)
  })

  it('a stale report (> 21 days) is not publishable even with a real signal', () => {
    expect(
      isPublishable({
        signal: { compositeScore: 7.5, flowScore: 3.0, sentimentScore: 6.0, consensusScore: 5.0 },
        latestReportDate: staleDate,
      })
    ).toBe(false)
  })

  it('a town with no nearby waters within MAX_NEAR_DISTANCE_MILES has no publishable waters', () => {
    // Place the town in the middle of the Pacific
    const oceanTown = { name: 'Ocean', slug: 'ocean', lat: 0, lon: -160, state: 'XX' }
    const waters = [makeWater('deschutes', 44.0, -121.0, 8.0)]
    const ranked = rankWatersNear(waters, oceanTown)
    expect(ranked).toHaveLength(0)
    const hasPublishable = ranked.some((r) =>
      isPublishable({ signal: r.currentSignal, latestReportDate: null })
    )
    expect(hasPublishable).toBe(false)
  })

  it('MAX_NEAR_DISTANCE_MILES is 200', () => {
    expect(MAX_NEAR_DISTANCE_MILES).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// isTownPublishable / publishableTowns / nearestPublishableTown /
// relevantPublishableTowns — town-level link gating for /near and contextual
// blocks (issue #147). A town must never be linked unless its near page is
// actually indexable.
// ---------------------------------------------------------------------------

describe('near town gating (issue #147)', () => {
  const freshDate = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 3)
    return d.toISOString().split('T')[0]
  })()

  const staleDate = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })()

  const goodSignal = {
    compositeScore: 7.5,
    flowScore: 3.0 as number | null,
    sentimentScore: 6.0 as number | null,
    consensusScore: 5.0 as number | null,
  }

  const noDataSignal = {
    compositeScore: 5.0,
    flowScore: null as number | null,
    sentimentScore: null as number | null,
    consensusScore: null as number | null,
  }

  // ~5 miles from Bend.
  const nearBendPublishable: NearGatingWater = {
    latitude: 44.0582,
    longitude: -121.25,
    currentSignal: goodSignal,
    recentReports: [{ reportDate: freshDate }],
  }

  it('isTownPublishable is true when a nearby water is publishable', () => {
    expect(isTownPublishable(bend, [nearBendPublishable])).toBe(true)
  })

  it('isTownPublishable is false when the nearby water has a stale report', () => {
    const stale: NearGatingWater = { ...nearBendPublishable, recentReports: [{ reportDate: staleDate }] }
    expect(isTownPublishable(bend, [stale])).toBe(false)
  })

  it('isTownPublishable is false when the nearby water has a no-data signal', () => {
    const noData: NearGatingWater = { ...nearBendPublishable, currentSignal: noDataSignal }
    expect(isTownPublishable(bend, [noData])).toBe(false)
  })

  it('isTownPublishable is false when the only publishable water is out of range', () => {
    // Miami is ~2700 miles from Bend.
    const far: NearGatingWater = { ...nearBendPublishable, latitude: 25.7617, longitude: -80.1918 }
    expect(isTownPublishable(bend, [far])).toBe(false)
  })

  it('publishableTowns filters to only towns with a publishable nearby water', () => {
    const towns = publishableTowns([nearBendPublishable])
    expect(towns.map((t) => t.slug)).toEqual(['bend-or'])
  })

  it('publishableTowns returns empty when no water is publishable anywhere', () => {
    expect(publishableTowns([])).toHaveLength(0)
  })

  it('nearestPublishableTown returns the nearest curated town within range', () => {
    const town = nearestPublishableTown(44.0582, -121.3153, [nearBendPublishable])
    expect(town?.slug).toBe('bend-or')
  })

  it('nearestPublishableTown returns null when no town is both in range and publishable', () => {
    expect(nearestPublishableTown(0, -160, [nearBendPublishable])).toBeNull()
  })

  it('relevantPublishableTowns requires both a basin water nearby AND global publishability', () => {
    const basinWaters: NearGatingWater[] = [{ ...nearBendPublishable, currentSignal: noDataSignal }]
    // The basin's own water isn't publishable, but a sibling elsewhere near
    // Bend is — the town should still qualify (global gate), since the basin
    // water itself still puts the basin within range of the town.
    const allWaters: NearGatingWater[] = [basinWaters[0], nearBendPublishable]
    const towns = relevantPublishableTowns(basinWaters, allWaters)
    expect(towns.map((t) => t.slug)).toEqual(['bend-or'])
  })

  it('relevantPublishableTowns excludes a town when no basin water is nearby', () => {
    const farBasinWater: NearGatingWater = { ...nearBendPublishable, latitude: 25.7617, longitude: -80.1918 }
    const towns = relevantPublishableTowns([farBasinWater], [nearBendPublishable])
    expect(towns).toHaveLength(0)
  })

  it('relevantPublishableTowns respects the limit', () => {
    const basinWaters: NearGatingWater[] = [nearBendPublishable]
    const towns = relevantPublishableTowns(basinWaters, [nearBendPublishable], 0)
    expect(towns).toHaveLength(0)
  })
})
