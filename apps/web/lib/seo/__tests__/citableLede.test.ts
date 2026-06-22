import { describe, it, expect } from 'vitest'
import { buildCitableLede, formatDate, type CitableLedeInput } from '@/lib/seo/citableLede'

describe('formatDate', () => {
  it('formats a YYYY-MM-DD string as "Month D, YYYY"', () => {
    expect(formatDate('2026-06-21')).toBe('June 21, 2026')
    expect(formatDate('2026-01-05')).toBe('January 5, 2026')
    expect(formatDate('2026-12-31')).toBe('December 31, 2026')
  })

  it('returns the input unchanged when it cannot be parsed', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date')
  })
})

const base: CitableLedeInput = {
  waterName: 'Lower Deschutes',
  asOfDate: '2026-06-21',
  score: 8.2,
  flowCfs: 4200,
  headlineHatch: 'Salmonfly',
  sourceCount: 3,
}

describe('buildCitableLede', () => {
  it('builds a full lede with all clauses present', () => {
    expect(buildCitableLede(base)).toBe(
      'As of June 21, 2026, the Lower Deschutes is fishing Great (8.2/10): flows are 4,200 cfs, Salmonfly activity, reported by 3 shops.'
    )
  })

  it('omits the flow clause when flowCfs is null', () => {
    const lede = buildCitableLede({ ...base, flowCfs: null })
    expect(lede).toContain('Salmonfly activity')
    expect(lede).not.toContain('cfs')
    expect(lede).toBe(
      'As of June 21, 2026, the Lower Deschutes is fishing Great (8.2/10): Salmonfly activity, reported by 3 shops.'
    )
  })

  it('omits the hatch clause when headlineHatch is null', () => {
    const lede = buildCitableLede({ ...base, headlineHatch: null })
    expect(lede).toContain('flows are 4,200 cfs')
    expect(lede).not.toContain('activity')
    expect(lede).toBe(
      'As of June 21, 2026, the Lower Deschutes is fishing Great (8.2/10): flows are 4,200 cfs, reported by 3 shops.'
    )
  })

  it('omits the colon-separated detail block when both flow and hatch are null', () => {
    const lede = buildCitableLede({ ...base, flowCfs: null, headlineHatch: null })
    expect(lede).not.toContain(':')
    expect(lede).toBe(
      'As of June 21, 2026, the Lower Deschutes is fishing Great (8.2/10), reported by 3 shops.'
    )
  })

  it('omits the source suffix when sourceCount is 0', () => {
    const lede = buildCitableLede({ ...base, sourceCount: 0 })
    expect(lede).not.toContain('shop')
    expect(lede).toBe(
      'As of June 21, 2026, the Lower Deschutes is fishing Great (8.2/10): flows are 4,200 cfs, Salmonfly activity.'
    )
  })

  it('uses singular "shop" when sourceCount is 1', () => {
    const lede = buildCitableLede({ ...base, sourceCount: 1 })
    expect(lede).toContain('reported by 1 shop')
    expect(lede).not.toContain('shops')
  })

  it('uses plural "shops" when sourceCount is greater than 1', () => {
    const lede = buildCitableLede({ ...base, sourceCount: 5 })
    expect(lede).toContain('reported by 5 shops')
  })

  it('uses "Currently," when asOfDate is null', () => {
    const lede = buildCitableLede({ ...base, asOfDate: null })
    expect(lede).toMatch(/^Currently,/)
    expect(lede).not.toContain('As of')
  })

  it('returns null when score is null (no usable signal)', () => {
    expect(buildCitableLede({ ...base, score: null })).toBeNull()
  })

  it('formats flow with thousands separator', () => {
    const lede = buildCitableLede({ ...base, flowCfs: 12345 })
    expect(lede).toContain('12,345 cfs')
  })

  it('includes the water name and score label in the output for AI excerpt self-containment', () => {
    const lede = buildCitableLede(base)
    expect(lede).toContain('Lower Deschutes')
    expect(lede).toContain('Great')
    expect(lede).toContain('8.2/10')
    expect(lede).toContain('June 21, 2026')
  })

  it('handles a low score using the correct label (Poor band)', () => {
    const lede = buildCitableLede({ ...base, score: 3.5 })
    expect(lede).toContain('Poor (3.5/10)')
  })

  it('handles no data at all — only score remains', () => {
    const lede = buildCitableLede({
      waterName: 'Metolius',
      asOfDate: null,
      score: 6.0,
      flowCfs: null,
      headlineHatch: null,
      sourceCount: 0,
    })
    expect(lede).toBe('Currently, the Metolius is fishing Fair (6.0/10).')
  })
})
