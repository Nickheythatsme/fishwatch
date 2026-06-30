import { describe, it, expect, vi, beforeEach } from 'vitest'

// Regression test for issue #125: /basin/[slug] hub pages were missing from
// sitemap.xml. These tests mock the underlying GraphQL fetch and assert that
// the sitemap emits one /basin/<slug> entry per basin that contains at least
// one PUBLISHABLE water — gated identically to the /water, /near, /compare
// entries via isPublishable().

const ssrQueryMock = vi.fn()
vi.mock('@/lib/graphql/execute', () => ({
  ssrQuery: (...args: unknown[]) => ssrQueryMock(...args),
}))

import sitemap from '../sitemap'

// A report date guaranteed to be inside PUBLISH_REPORT_WINDOW_DAYS (21) of now,
// so the publishability gate keys off the test data rather than the calendar.
function freshReportDate(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

// A report date well outside the publish window so the gate rejects it.
function staleReportDate(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 90)
  return d.toISOString().slice(0, 10)
}

const goodSignal = {
  scoreDate: freshReportDate(),
  compositeScore: 8.1,
  flowScore: 7.5,
  sentimentScore: 8.0,
  consensusScore: 9.0,
}

describe('sitemap /basin entries (issue #125)', () => {
  beforeEach(() => {
    ssrQueryMock.mockReset()
  })

  it('emits a /basin entry for basins with at least one publishable water', async () => {
    ssrQueryMock.mockResolvedValue({
      waterBodies: [
        {
          slug: 'deschutes-river',
          latitude: 44.1,
          longitude: -121.3,
          basin: { slug: 'deschutes' },
          currentSignal: goodSignal,
          recentReports: [{ reportDate: freshReportDate() }],
        },
        {
          // Same basin, unpublishable (stale) — basin still qualifies via sibling.
          slug: 'crooked-river',
          latitude: 44.2,
          longitude: -121.1,
          basin: { slug: 'deschutes' },
          currentSignal: { ...goodSignal },
          recentReports: [{ reportDate: staleReportDate() }],
        },
      ],
    })

    const entries = await sitemap()
    const basinEntries = entries.filter((e) => e.url.includes('/basin/'))
    expect(basinEntries).toHaveLength(1)
    expect(basinEntries[0]).toMatchObject({
      url: 'https://score.fish/basin/deschutes',
      changeFrequency: 'daily',
      priority: 0.6,
    })
  })

  it('omits basins whose waters are all unpublishable, and waters with no basin', async () => {
    ssrQueryMock.mockResolvedValue({
      waterBodies: [
        {
          slug: 'stale-water',
          latitude: 45,
          longitude: -122,
          basin: { slug: 'willamette' },
          currentSignal: { ...goodSignal },
          recentReports: [{ reportDate: staleReportDate() }],
        },
        {
          slug: 'orphan-water',
          latitude: 45,
          longitude: -122,
          basin: null,
          currentSignal: goodSignal,
          recentReports: [{ reportDate: freshReportDate() }],
        },
      ],
    })

    const entries = await sitemap()
    const basinEntries = entries.filter((e) => e.url.includes('/basin/'))
    expect(basinEntries).toHaveLength(0)
  })

  it('derives lastModified from the freshest publishable member water', async () => {
    const fresh = freshReportDate()
    ssrQueryMock.mockResolvedValue({
      waterBodies: [
        {
          slug: 'metolius-river',
          latitude: 44.5,
          longitude: -121.6,
          basin: { slug: 'deschutes' },
          currentSignal: { ...goodSignal, scoreDate: fresh },
          recentReports: [{ reportDate: fresh }],
        },
      ],
    })

    const entries = await sitemap()
    const basinEntry = entries.find((e) => e.url === 'https://score.fish/basin/deschutes')
    expect(basinEntry).toBeDefined()
    expect(basinEntry?.lastModified).toEqual(new Date(fresh))
  })

  it('falls back to static entries (no /basin) when the data source is unreachable', async () => {
    ssrQueryMock.mockRejectedValue(new Error('db down'))
    const entries = await sitemap()
    expect(entries.some((e) => e.url.includes('/basin/'))).toBe(false)
  })
})

// Regression test for issue #147: the /near and /compare hub pages are static,
// always-publishable index pages, so they must always be present in the
// sitemap — unlike the gated /near/[town] and /compare/[pair] leaves.
describe('sitemap /near and /compare hub entries (issue #147)', () => {
  beforeEach(() => {
    ssrQueryMock.mockReset()
  })

  it('always includes the /near and /compare hub URLs, even with no waters', async () => {
    ssrQueryMock.mockResolvedValue({ waterBodies: [] })
    const entries = await sitemap()
    expect(entries.some((e) => e.url === 'https://score.fish/near')).toBe(true)
    expect(entries.some((e) => e.url === 'https://score.fish/compare')).toBe(true)
  })

  it('still includes the hub URLs when the data source is unreachable', async () => {
    ssrQueryMock.mockRejectedValue(new Error('db down'))
    const entries = await sitemap()
    expect(entries.some((e) => e.url === 'https://score.fish/near')).toBe(true)
    expect(entries.some((e) => e.url === 'https://score.fish/compare')).toBe(true)
  })
})
