import { describe, it, expect } from 'vitest'
import {
  activeFilterCount,
  matchesReportFilters,
  parseReportFilters,
  serializeReportFilters,
  type ReportFilters,
} from '@/components/reports/filters'

describe('parseReportFilters', () => {
  it('returns empty arrays when params are absent', () => {
    expect(parseReportFilters(new URLSearchParams())).toEqual({
      sources: [],
      species: [],
    })
  })

  it('splits comma lists and trims whitespace, dropping empties', () => {
    const params = new URLSearchParams('source=deschutes_angler, fly_box ,&species=trout,,steelhead')
    expect(parseReportFilters(params)).toEqual({
      sources: ['deschutes_angler', 'fly_box'],
      species: ['trout', 'steelhead'],
    })
  })
})

describe('serializeReportFilters', () => {
  it('sets params for populated dimensions', () => {
    const qs = serializeReportFilters(new URLSearchParams(), {
      sources: ['a', 'b'],
      species: ['trout'],
    })
    const params = new URLSearchParams(qs)
    expect(params.get('source')).toBe('a,b')
    expect(params.get('species')).toBe('trout')
  })

  it('deletes params for empty dimensions', () => {
    const current = new URLSearchParams('source=a&species=trout')
    const qs = serializeReportFilters(current, { sources: [], species: [] })
    expect(qs).toBe('')
  })

  it('preserves unrelated params', () => {
    const current = new URLSearchParams('foo=bar')
    const qs = serializeReportFilters(current, { sources: ['a'], species: [] })
    const params = new URLSearchParams(qs)
    expect(params.get('foo')).toBe('bar')
    expect(params.get('source')).toBe('a')
    expect(params.has('species')).toBe(false)
  })

  it('round-trips with parseReportFilters', () => {
    const filters: ReportFilters = { sources: ['a', 'b'], species: ['trout'] }
    const qs = serializeReportFilters(new URLSearchParams(), filters)
    expect(parseReportFilters(new URLSearchParams(qs))).toEqual(filters)
  })
})

describe('matchesReportFilters', () => {
  const report = { sourceName: 'deschutes_angler', speciesMentioned: ['Trout', 'Steelhead'] }

  it('passes everything when no filters are active', () => {
    expect(matchesReportFilters(report, { sources: [], species: [] })).toBe(true)
  })

  it('matches on source membership', () => {
    expect(matchesReportFilters(report, { sources: ['deschutes_angler'], species: [] })).toBe(true)
    expect(matchesReportFilters(report, { sources: ['fly_box'], species: [] })).toBe(false)
  })

  it('matches species case-insensitively via intersection', () => {
    expect(matchesReportFilters(report, { sources: [], species: ['trout'] })).toBe(true)
    expect(matchesReportFilters(report, { sources: [], species: ['bass'] })).toBe(false)
  })

  it('requires all active dimensions to match (AND)', () => {
    expect(
      matchesReportFilters(report, { sources: ['deschutes_angler'], species: ['trout'] })
    ).toBe(true)
    expect(
      matchesReportFilters(report, { sources: ['fly_box'], species: ['trout'] })
    ).toBe(false)
  })

  it('handles reports with no species', () => {
    const empty = { sourceName: 'fly_box', speciesMentioned: [] }
    expect(matchesReportFilters(empty, { sources: [], species: ['trout'] })).toBe(false)
    expect(matchesReportFilters(empty, { sources: ['fly_box'], species: [] })).toBe(true)
  })
})

describe('activeFilterCount', () => {
  it('sums both dimensions', () => {
    expect(activeFilterCount({ sources: [], species: [] })).toBe(0)
    expect(activeFilterCount({ sources: ['a', 'b'], species: ['trout'] })).toBe(3)
  })
})
