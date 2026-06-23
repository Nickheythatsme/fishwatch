export interface PairSlug {
  slugA: string
  slugB: string
}

/**
 * Normalise to alphabetical order so A-vs-B and B-vs-A are treated as the same
 * pair. All pair URLs and de-dup keys use this canonical form.
 */
export function canonicalPair(a: string, b: string): PairSlug {
  if (a <= b) return { slugA: a, slugB: b }
  return { slugA: b, slugB: a }
}

// Hardcoded marquee cross-basin matchups. Pairs are included only when BOTH
// slugs exist in the DB; non-existent slugs are silently dropped.
const MARQUEE_PAIRS: PairSlug[] = [
  { slugA: 'deschutes-river', slugB: 'rogue-river' },
  { slugA: 'deschutes-river', slugB: 'sandy-river' },
  { slugA: 'deschutes-river', slugB: 'clackamas-river' },
  { slugA: 'rogue-river', slugB: 'umpqua-river' },
]

interface WaterWithBasin {
  slug: string
  basin?: { slug: string } | null
}

/**
 * Build the curated pair set: all within-basin C(n,2) combos plus marquee
 * cross-basin matchups. Pairs are canonical (slugA ≤ slugB) and deduplicated.
 * Both slugs must exist in `waters`; non-existent marquee slugs are dropped.
 *
 * This intentionally avoids n² cross-basin expansion — only explicit pairs
 * appear across basins. See TASK_BRIEF §2 for the thin-content rationale.
 */
export function selectCuratedPairs(waters: WaterWithBasin[]): PairSlug[] {
  const slugSet = new Set(waters.map((w) => w.slug))
  const seen = new Set<string>()
  const pairs: PairSlug[] = []

  function tryAdd(a: string, b: string) {
    const pair = canonicalPair(a, b)
    const key = `${pair.slugA}::${pair.slugB}`
    if (seen.has(key)) return
    if (!slugSet.has(pair.slugA) || !slugSet.has(pair.slugB)) return
    seen.add(key)
    pairs.push(pair)
  }

  // Group by basin.
  const byBasin = new Map<string, string[]>()
  for (const w of waters) {
    const bs = w.basin?.slug
    if (!bs) continue
    const list = byBasin.get(bs) ?? []
    list.push(w.slug)
    byBasin.set(bs, list)
  }

  // All within-basin C(n,2) pairs.
  for (const basinWaters of Array.from(byBasin.values())) {
    for (let i = 0; i < basinWaters.length; i++) {
      for (let j = i + 1; j < basinWaters.length; j++) {
        tryAdd(basinWaters[i], basinWaters[j])
      }
    }
  }

  // Marquee cross-basin pairs.
  for (const { slugA, slugB } of MARQUEE_PAIRS) {
    tryAdd(slugA, slugB)
  }

  return pairs
}

/**
 * Parse a `/compare/[pair]` route segment (`slugA-vs-slugB`) into its two
 * constituent slugs. Returns null for malformed params (no `-vs-` separator,
 * or either slug is empty).
 *
 * Does NOT enforce canonical order — callers must redirect if needed.
 */
export function parsePair(param: string): { slugA: string; slugB: string } | null {
  const idx = param.indexOf('-vs-')
  if (idx <= 0 || idx + 4 >= param.length) return null
  return {
    slugA: param.slice(0, idx),
    slugB: param.slice(idx + 4),
  }
}

/**
 * Check whether a pair of waters qualifies as curated: either they share a
 * basin, or they appear (in either order) in the MARQUEE_PAIRS list.
 *
 * Used by the compare page at request time to reject arbitrary URL-crafted
 * pairs without refetching the full water list.
 */
export function isPairCurated(
  waterA: WaterWithBasin,
  waterB: WaterWithBasin
): boolean {
  const basinA = waterA.basin?.slug
  const basinB = waterB.basin?.slug
  if (basinA && basinA === basinB) return true

  const pair = canonicalPair(waterA.slug, waterB.slug)
  return MARQUEE_PAIRS.some((m) => {
    const cm = canonicalPair(m.slugA, m.slugB)
    return cm.slugA === pair.slugA && cm.slugB === pair.slugB
  })
}
