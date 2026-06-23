import { describe, it, expect } from 'vitest'
import { isPublishable, PUBLISH_REPORT_WINDOW_DAYS } from '@/lib/seo/gating'

const NOW = new Date('2026-06-22T12:00:00Z')

function daysAgo(days: number): string {
  const d = new Date(NOW)
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

const REAL_SIGNAL = {
  compositeScore: 7.5,
  flowScore: 7,
  sentimentScore: 8,
  consensusScore: 7,
}

const NO_DATA_SIGNAL = {
  compositeScore: 5.0,
  flowScore: null,
  sentimentScore: null,
  consensusScore: null,
}

describe('isPublishable', () => {
  it('returns false for null signal', () => {
    expect(isPublishable({ signal: null, latestReportDate: daysAgo(0) }, NOW)).toBe(false)
  })

  it('returns false for undefined signal', () => {
    expect(isPublishable({ signal: undefined, latestReportDate: daysAgo(0) }, NOW)).toBe(false)
  })

  it('returns false for no-data signal (compositeScore=5, all subscores null)', () => {
    expect(isPublishable({ signal: NO_DATA_SIGNAL, latestReportDate: daysAgo(0) }, NOW)).toBe(false)
  })

  it('returns false when latestReportDate is null', () => {
    expect(isPublishable({ signal: REAL_SIGNAL, latestReportDate: null }, NOW)).toBe(false)
  })

  it('returns false when latestReportDate is undefined', () => {
    expect(isPublishable({ signal: REAL_SIGNAL, latestReportDate: undefined }, NOW)).toBe(false)
  })

  it(`returns false when report is ${PUBLISH_REPORT_WINDOW_DAYS + 1} days old (outside window)`, () => {
    expect(
      isPublishable({ signal: REAL_SIGNAL, latestReportDate: daysAgo(PUBLISH_REPORT_WINDOW_DAYS + 1) }, NOW)
    ).toBe(false)
  })

  it(`returns true at exactly ${PUBLISH_REPORT_WINDOW_DAYS} days old (boundary — inclusive)`, () => {
    expect(
      isPublishable({ signal: REAL_SIGNAL, latestReportDate: daysAgo(PUBLISH_REPORT_WINDOW_DAYS) }, NOW)
    ).toBe(true)
  })

  it('returns true for a fresh report from today', () => {
    expect(isPublishable({ signal: REAL_SIGNAL, latestReportDate: daysAgo(0) }, NOW)).toBe(true)
  })

  it('returns true for a report 10 days ago', () => {
    expect(isPublishable({ signal: REAL_SIGNAL, latestReportDate: daysAgo(10) }, NOW)).toBe(true)
  })

  it('returns false for a real signal with a stale report (22 days)', () => {
    expect(isPublishable({ signal: REAL_SIGNAL, latestReportDate: daysAgo(22) }, NOW)).toBe(false)
  })

  it('returns false for a no-data signal even with a fresh report', () => {
    expect(
      isPublishable({ signal: NO_DATA_SIGNAL, latestReportDate: daysAgo(1) }, NOW)
    ).toBe(false)
  })

  it('accepts a real 5.0 composite with subscores as publishable (not a no-data placeholder)', () => {
    const realFive = { compositeScore: 5.0, flowScore: 5, sentimentScore: 5, consensusScore: 5 }
    expect(isPublishable({ signal: realFive, latestReportDate: daysAgo(0) }, NOW)).toBe(true)
  })
})
