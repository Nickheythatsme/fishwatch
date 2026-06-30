import { describe, it, expect } from 'vitest'
import {
  parsePair,
  canonicalPair,
  selectCuratedPairs,
  isPairCurated,
  selectComparePairLinks,
  type ComparePairLinkWater,
} from '@/lib/compare/pairs'
import { isPublishable } from '@/lib/seo/gating'

// ---------------------------------------------------------------------------
// parsePair
// ---------------------------------------------------------------------------

describe('parsePair', () => {
  it('splits a simple pair on -vs-', () => {
    expect(parsePair('deschutes-river-vs-rogue-river')).toEqual({
      slugA: 'deschutes-river',
      slugB: 'rogue-river',
    })
  })

  it('handles slugs with multiple hyphens correctly', () => {
    expect(parsePair('middle-fork-willamette-vs-north-fork-willamette')).toEqual({
      slugA: 'middle-fork-willamette',
      slugB: 'north-fork-willamette',
    })
  })

  it('returns null when -vs- separator is absent', () => {
    expect(parsePair('deschutes-river')).toBeNull()
  })

  it('returns null when slugA is empty', () => {
    expect(parsePair('-vs-rogue-river')).toBeNull()
  })

  it('returns null when slugB is empty', () => {
    expect(parsePair('deschutes-river-vs-')).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(parsePair('')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// canonicalPair
// ---------------------------------------------------------------------------

describe('canonicalPair', () => {
  it('puts the alphabetically earlier slug first', () => {
    expect(canonicalPair('rogue-river', 'deschutes-river')).toEqual({
      slugA: 'deschutes-river',
      slugB: 'rogue-river',
    })
  })

  it('keeps order when already canonical', () => {
    expect(canonicalPair('deschutes-river', 'rogue-river')).toEqual({
      slugA: 'deschutes-river',
      slugB: 'rogue-river',
    })
  })

  it('is idempotent', () => {
    const first = canonicalPair('b', 'a')
    const second = canonicalPair(first.slugA, first.slugB)
    expect(first).toEqual(second)
  })
})

// ---------------------------------------------------------------------------
// selectCuratedPairs
// ---------------------------------------------------------------------------

const deschutesBasin = { slug: 'deschutes-basin' }
const rogueBasin = { slug: 'rogue-basin' }

const sampleWaters = [
  { slug: 'deschutes-river', basin: deschutesBasin },
  { slug: 'crooked-river', basin: deschutesBasin },
  { slug: 'metolius-river', basin: deschutesBasin },
  { slug: 'rogue-river', basin: rogueBasin },
  { slug: 'umpqua-river', basin: { slug: 'umpqua-basin' } },
]

describe('selectCuratedPairs', () => {
  it('generates all within-basin C(n,2) pairs', () => {
    const pairs = selectCuratedPairs(sampleWaters)
    const keys = pairs.map((p) => `${p.slugA}::${p.slugB}`)
    // Deschutes basin: deschutes+crooked, deschutes+metolius, crooked+metolius
    expect(keys).toContain('crooked-river::deschutes-river')
    expect(keys).toContain('deschutes-river::metolius-river')
    expect(keys).toContain('crooked-river::metolius-river')
  })

  it('includes matching marquee cross-basin pairs', () => {
    const pairs = selectCuratedPairs(sampleWaters)
    const keys = pairs.map((p) => `${p.slugA}::${p.slugB}`)
    // 'deschutes-river' vs 'rogue-river' is a marquee pair and both exist
    expect(keys).toContain('deschutes-river::rogue-river')
    // 'rogue-river' vs 'umpqua-river' is also marquee and both exist
    expect(keys).toContain('rogue-river::umpqua-river')
  })

  it('does not cross-pair non-marquee different-basin waters', () => {
    // crooked-river (Deschutes) vs rogue-river (Rogue) is NOT in marquee list
    const pairs = selectCuratedPairs(sampleWaters)
    const keys = pairs.map((p) => `${p.slugA}::${p.slugB}`)
    expect(keys).not.toContain('crooked-river::rogue-river')
    expect(keys).not.toContain('metolius-river::rogue-river')
  })

  it('does not explode to n² pairs — count stays small', () => {
    const pairs = selectCuratedPairs(sampleWaters)
    // 5 waters: n² = 25, but we should have far fewer (3 within-basin + ≤4 marquee)
    expect(pairs.length).toBeLessThan(10)
  })

  it('deduplicates — no pair appears twice', () => {
    const pairs = selectCuratedPairs(sampleWaters)
    const keys = pairs.map((p) => `${p.slugA}::${p.slugB}`)
    const unique = new Set(keys)
    expect(keys.length).toBe(unique.size)
  })

  it('all pairs are in canonical order (slugA ≤ slugB)', () => {
    const pairs = selectCuratedPairs(sampleWaters)
    for (const p of pairs) {
      expect(p.slugA <= p.slugB).toBe(true)
    }
  })

  it('drops marquee pairs where a slug is not in the water list', () => {
    // sandy-river and clackamas-river are not in sampleWaters
    const pairs = selectCuratedPairs(sampleWaters)
    const slugsUsed = new Set(pairs.flatMap((p) => [p.slugA, p.slugB]))
    expect(slugsUsed.has('sandy-river')).toBe(false)
    expect(slugsUsed.has('clackamas-river')).toBe(false)
  })

  it('returns empty array when there are no waters', () => {
    expect(selectCuratedPairs([])).toHaveLength(0)
  })

  it('returns empty array when no water has a basin', () => {
    const noBasin = [
      { slug: 'river-a', basin: null },
      { slug: 'river-b', basin: null },
    ]
    // No within-basin pairs; no marquee slugs match → 0
    expect(selectCuratedPairs(noBasin)).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// isPairCurated
// ---------------------------------------------------------------------------

describe('isPairCurated', () => {
  it('returns true for same-basin pair', () => {
    const a = { slug: 'deschutes-river', basin: deschutesBasin }
    const b = { slug: 'crooked-river', basin: deschutesBasin }
    expect(isPairCurated(a, b)).toBe(true)
  })

  it('returns true regardless of argument order for same-basin', () => {
    const a = { slug: 'deschutes-river', basin: deschutesBasin }
    const b = { slug: 'crooked-river', basin: deschutesBasin }
    expect(isPairCurated(a, b)).toBe(isPairCurated(b, a))
  })

  it('returns false for different-basin non-marquee pair', () => {
    const a = { slug: 'crooked-river', basin: deschutesBasin }
    const b = { slug: 'rogue-river', basin: rogueBasin }
    expect(isPairCurated(a, b)).toBe(false)
  })

  it('returns true for marquee cross-basin pair (either order)', () => {
    const a = { slug: 'deschutes-river', basin: deschutesBasin }
    const b = { slug: 'rogue-river', basin: rogueBasin }
    expect(isPairCurated(a, b)).toBe(true)
    expect(isPairCurated(b, a)).toBe(true)
  })

  it('returns false when water has no basin and is not a marquee slug', () => {
    const a = { slug: 'mystery-river', basin: null }
    const b = { slug: 'crooked-river', basin: deschutesBasin }
    expect(isPairCurated(a, b)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Gating: pairs excluded when either water is not publishable
// ---------------------------------------------------------------------------

describe('compare pair gating', () => {
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

  it('pair is indexable only when both waters are publishable', () => {
    const pubA = isPublishable({ signal: goodSignal, latestReportDate: freshDate })
    const pubB = isPublishable({ signal: goodSignal, latestReportDate: freshDate })
    expect(pubA && pubB).toBe(true)
  })

  it('pair is gated when water A is a no-data sentinel', () => {
    const pubA = isPublishable({ signal: noDataSignal, latestReportDate: freshDate })
    const pubB = isPublishable({ signal: goodSignal, latestReportDate: freshDate })
    expect(pubA && pubB).toBe(false)
  })

  it('pair is gated when water B has a stale report', () => {
    const pubA = isPublishable({ signal: goodSignal, latestReportDate: freshDate })
    const pubB = isPublishable({ signal: goodSignal, latestReportDate: staleDate })
    expect(pubA && pubB).toBe(false)
  })

  it('selectCuratedPairs applied to waters with no signals produces pairs that all fail gating', () => {
    const waters = [
      { slug: 'river-a', basin: deschutesBasin, currentSignal: null, recentReports: [{ reportDate: freshDate }] },
      { slug: 'river-b', basin: deschutesBasin, currentSignal: null, recentReports: [{ reportDate: freshDate }] },
    ]
    const pairs = selectCuratedPairs(waters)
    expect(pairs.length).toBeGreaterThan(0)
    const publishablePairs = pairs.filter(({ slugA, slugB }) => {
      const a = waters.find((w) => w.slug === slugA)!
      const b = waters.find((w) => w.slug === slugB)!
      return (
        isPublishable({ signal: a.currentSignal, latestReportDate: a.recentReports[0]?.reportDate ?? null }) &&
        isPublishable({ signal: b.currentSignal, latestReportDate: b.recentReports[0]?.reportDate ?? null })
      )
    })
    expect(publishablePairs).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// selectComparePairLinks — gated, labeled, capped link selection for
// contextual "Compare with…" blocks (issue #147)
// ---------------------------------------------------------------------------

describe('selectComparePairLinks', () => {
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

  function water(
    slug: string,
    basinSlug: string,
    overrides: Partial<ComparePairLinkWater> = {}
  ): ComparePairLinkWater {
    return {
      slug,
      name: slug,
      basin: { slug: basinSlug },
      currentSignal: goodSignal,
      recentReports: [{ reportDate: freshDate }],
      ...overrides,
    }
  }

  it('returns labeled links for publishable curated pairs', () => {
    const waters = [
      water('deschutes-river', 'deschutes-basin', { name: 'Deschutes River' }),
      water('crooked-river', 'deschutes-basin', { name: 'Crooked River' }),
    ]
    const links = selectComparePairLinks(waters, () => true)
    expect(links).toHaveLength(1)
    expect(links[0]).toMatchObject({
      slugA: 'crooked-river',
      slugB: 'deschutes-river',
      nameA: 'Crooked River',
      nameB: 'Deschutes River',
    })
  })

  it('never includes a pair where either water is unpublishable (stale report)', () => {
    const waters = [
      water('deschutes-river', 'deschutes-basin'),
      water('crooked-river', 'deschutes-basin', {
        recentReports: [{ reportDate: staleDate }],
      }),
    ]
    expect(selectComparePairLinks(waters, () => true)).toHaveLength(0)
  })

  it('never includes a pair where either water has a no-data signal', () => {
    const noDataSignal = {
      compositeScore: 5.0,
      flowScore: null,
      sentimentScore: null,
      consensusScore: null,
    }
    const waters = [
      water('deschutes-river', 'deschutes-basin'),
      water('crooked-river', 'deschutes-basin', { currentSignal: noDataSignal }),
    ]
    expect(selectComparePairLinks(waters, () => true)).toHaveLength(0)
  })

  it('respects the include filter (e.g. only pairs involving one water)', () => {
    const waters = [
      water('deschutes-river', 'deschutes-basin'),
      water('crooked-river', 'deschutes-basin'),
      water('metolius-river', 'deschutes-basin'),
    ]
    const links = selectComparePairLinks(
      waters,
      (pair) => pair.slugA === 'metolius-river' || pair.slugB === 'metolius-river'
    )
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expect([link.slugA, link.slugB]).toContain('metolius-river')
    }
  })

  it('caps results to the limit', () => {
    const waters = [
      water('a-river', 'basin-1'),
      water('b-river', 'basin-1'),
      water('c-river', 'basin-1'),
      water('d-river', 'basin-1'),
    ]
    // basin-1 C(4,2) = 6 curated pairs, all publishable — capped to 2.
    const links = selectComparePairLinks(waters, () => true, 2)
    expect(links).toHaveLength(2)
  })

  it('supports an uncapped Infinity limit for the /compare index', () => {
    const waters = [
      water('a-river', 'basin-1'),
      water('b-river', 'basin-1'),
      water('c-river', 'basin-1'),
      water('d-river', 'basin-1'),
    ]
    const links = selectComparePairLinks(waters, () => true, Infinity)
    expect(links).toHaveLength(6)
  })

  it('returns an empty array when no pairs are curated', () => {
    const waters = [water('lone-river', 'lone-basin')]
    expect(selectComparePairLinks(waters, () => true)).toHaveLength(0)
  })
})
