import { describe, it, expect } from 'vitest'
import { buildSchema, parse, validate } from 'graphql'
import { clampInt, LIMITS } from '@/lib/graphql/limits'
import { maxDepthRule } from '@/lib/graphql/depthLimit'
import { typeDefs } from '@/lib/graphql/schema'

describe('clampInt', () => {
  it('returns the fallback for null / undefined / NaN', () => {
    expect(clampInt(null, 20, 100)).toBe(20)
    expect(clampInt(undefined, 20, 100)).toBe(20)
    expect(clampInt(NaN, 20, 100)).toBe(20)
  })

  it('caps values above max', () => {
    expect(clampInt(999_999_999, 20, 100)).toBe(100)
    expect(clampInt(101, 20, 100)).toBe(100)
  })

  it('floors values below min (default min 0)', () => {
    expect(clampInt(-5, 20, 100)).toBe(0)
    expect(clampInt(-5, 20, 100, 1)).toBe(1)
  })

  it('floors fractional values', () => {
    expect(clampInt(5.9, 20, 100)).toBe(5)
    expect(clampInt(99.999, 20, 100)).toBe(99)
  })

  it('passes through in-range integers', () => {
    expect(clampInt(50, 20, 100)).toBe(50)
    expect(clampInt(0, 20, 100)).toBe(0)
    expect(clampInt(100, 20, 100)).toBe(100)
  })

  it('clamps each configured field to its documented bound', () => {
    expect(clampInt(10_000, LIMITS.reports.limit.default, LIMITS.reports.limit.max)).toBe(100)
    expect(clampInt(10_000, LIMITS.gaugeReadings.hours.default, LIMITS.gaugeReadings.hours.max)).toBe(
      720
    )
  })
})

describe('maxDepthRule', () => {
  const schema = buildSchema(typeDefs)

  const depthErrors = (query: string, max: number) =>
    validate(schema, parse(query), [maxDepthRule(max)])

  it('allows a shallow query', () => {
    expect(depthErrors('{ waterBodies { name } }', 12)).toHaveLength(0)
  })

  it('rejects a query nested past the limit (cyclic WaterBody <-> Report)', () => {
    const deep = `{
      waterBodies {
        recentReports { waterBody { recentReports { waterBody {
          recentReports { waterBody { recentReports { waterBody {
            recentReports { waterBody { recentReports { name } } }
          } } } }
        } } } }
      }
    }`
    const errors = depthErrors(deep, 12)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].message).toContain('maximum allowed depth of 12')
  })

  it('counts depth through fragment spreads', () => {
    const withFragment = `
      query { waterBodies { ...Deep } }
      fragment Deep on WaterBody {
        recentReports { waterBody { recentReports { waterBody { name } } } }
      }
    `
    // waterBodies(1) -> [fragment] recentReports/waterBody x2 + name = depth 6.
    expect(depthErrors(withFragment, 6)).toHaveLength(0)
    expect(depthErrors(withFragment, 5).length).toBeGreaterThan(0)
  })

  it('does not loop forever on a self-referential fragment', () => {
    // A fragment that spreads itself is invalid GraphQL, but the rule must not
    // hang while walking it. Guarded by the visited-fragment set.
    const cyclic = `
      query { waterBodies { ...A } }
      fragment A on WaterBody { recentReports { waterBody { ...A } } }
    `
    expect(() => depthErrors(cyclic, 12)).not.toThrow()
  })
})
