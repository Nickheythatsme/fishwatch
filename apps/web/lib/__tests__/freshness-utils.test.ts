import { describe, it, expect } from 'vitest'
import { deriveFreshness } from '@/components/water/freshness-utils'

// Fixed "now" so day-age math is deterministic regardless of wall clock.
const NOW = new Date('2026-06-21T12:00:00Z')

function report(sourceName: string, reportDate: string | null) {
  return { sourceName, sourceUrl: `https://${sourceName}.example.com/post`, reportDate }
}

function gauge(measuredAt: string | null) {
  return { measuredAt }
}

describe('deriveFreshness — tiers', () => {
  it('high: 2+ distinct sources with recent data', () => {
    const f = deriveFreshness({
      reports: [report('deschutes_angler', '2026-06-20'), report('confluence_fly_shop', '2026-06-19')],
      gaugeReadings: [gauge('2026-06-21T08:00:00Z')],
      now: NOW,
    })
    expect(f.tier).toBe('high')
    expect(f.variant).toBe('secondary')
    expect(f.sourceCount).toBe(2)
    expect(f.freshestDate).toBe('2026-06-21') // gauge is the freshest point
    expect(f.freshestAgeDays).toBe(0)
  })

  it('medium: a single recent source', () => {
    const f = deriveFreshness({
      reports: [report('deschutes_angler', '2026-06-18')],
      gaugeReadings: [],
      now: NOW,
    })
    expect(f.tier).toBe('medium')
    expect(f.variant).toBe('tertiary')
    expect(f.sourceCount).toBe(1)
    expect(f.freshestAgeDays).toBe(3)
  })

  it('medium: same source reported twice counts as one source', () => {
    const f = deriveFreshness({
      reports: [report('deschutes_angler', '2026-06-20'), report('deschutes_angler', '2026-06-19')],
      gaugeReadings: [],
      now: NOW,
    })
    expect(f.sourceCount).toBe(1)
    expect(f.tier).toBe('medium') // recent, but only one distinct source
  })

  it('low: stale data even with multiple sources', () => {
    const f = deriveFreshness({
      reports: [report('deschutes_angler', '2026-06-01'), report('confluence_fly_shop', '2026-05-30')],
      gaugeReadings: [],
      now: NOW,
    })
    expect(f.tier).toBe('low')
    expect(f.variant).toBe('error')
    expect(f.freshestAgeDays).toBe(20)
  })

  it('low: recent gauge data but no shop reports', () => {
    const f = deriveFreshness({
      reports: [],
      gaugeReadings: [gauge('2026-06-21T06:00:00Z')],
      now: NOW,
    })
    expect(f.tier).toBe('low')
    expect(f.sourceCount).toBe(0)
    expect(f.freshestDate).toBe('2026-06-21')
  })

  it('none: no reports and no gauge readings', () => {
    const f = deriveFreshness({
      reports: [],
      gaugeReadings: [],
      scoreDate: '2026-06-15',
      now: NOW,
    })
    expect(f.tier).toBe('none')
    expect(f.variant).toBe('neutral')
    expect(f.label).toBe('No data yet')
    expect(f.sourceCount).toBe(0)
  })

  it('low: a source exists but its data cannot be dated', () => {
    const f = deriveFreshness({
      reports: [report('deschutes_angler', null)],
      gaugeReadings: [],
      scoreDate: '2026-06-20',
      now: NOW,
    })
    expect(f.tier).toBe('low') // present but undatable -> can't vouch for freshness
    expect(f.sourceCount).toBe(1)
    expect(f.freshestDate).toBe('2026-06-20') // score date used for display only
  })
})

describe('deriveFreshness — boundaries', () => {
  it('treats exactly FRESH_DAYS (3) as high with 2 sources', () => {
    const f = deriveFreshness({
      reports: [report('a', '2026-06-18'), report('b', '2026-06-18')],
      gaugeReadings: [],
      now: NOW,
    })
    expect(f.freshestAgeDays).toBe(3)
    expect(f.tier).toBe('high')
  })

  it('drops to medium one day past FRESH_DAYS with 2 sources', () => {
    const f = deriveFreshness({
      reports: [report('a', '2026-06-17'), report('b', '2026-06-17')],
      gaugeReadings: [],
      now: NOW,
    })
    expect(f.freshestAgeDays).toBe(4)
    expect(f.tier).toBe('medium')
  })

  it('treats exactly AGING_DAYS (7) as medium, but stale at 8', () => {
    const within = deriveFreshness({
      reports: [report('a', '2026-06-14')],
      gaugeReadings: [],
      now: NOW,
    })
    expect(within.freshestAgeDays).toBe(7)
    expect(within.tier).toBe('medium')

    const past = deriveFreshness({
      reports: [report('a', '2026-06-13')],
      gaugeReadings: [],
      now: NOW,
    })
    expect(past.freshestAgeDays).toBe(8)
    expect(past.tier).toBe('low')
  })

  it('clamps future dates to age 0', () => {
    const f = deriveFreshness({
      reports: [report('a', '2026-06-25')],
      gaugeReadings: [],
      now: NOW,
    })
    expect(f.freshestAgeDays).toBe(0)
  })
})
