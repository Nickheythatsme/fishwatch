import { describe, it, expect } from 'vitest'
import {
  buildWaterMetadata,
  buildLeaderboardMetadata,
  buildReportsMetadata,
  SITE_URL,
} from '@/lib/seo/metadata'

const base = {
  name: 'Crooked River',
  slug: 'crooked-river',
  description: 'Tailwater below Bowman Dam. Consistent year-round nymphing.',
  currentFlow: 142,
  currentSignal: {
    compositeScore: 7.4,
    summary: 'Steady flows and strong BWO activity have fish looking up.',
  },
}

describe('buildWaterMetadata', () => {
  it('builds a unique, freshness-stamped title with the water name', () => {
    const meta = buildWaterMetadata(base)
    expect(meta.title).toMatch(/^Crooked River Fishing Report & Conditions — /)
    // Month + 4-digit year (e.g. "June 2026") makes it read as current.
    expect(meta.title).toMatch(/[A-Z][a-z]+ \d{4}$/)
  })

  it('prefers the signal summary and appends current flow in the description', () => {
    const meta = buildWaterMetadata(base)
    expect(meta.description).toContain('strong BWO activity')
    expect(meta.description).toContain('142 cfs')
  })

  it('falls back to the static description when there is no signal', () => {
    const meta = buildWaterMetadata({ ...base, currentSignal: null, currentFlow: null })
    expect(meta.description).toContain('year-round nymphing')
  })

  it('falls back to a generic description when nothing is available', () => {
    const meta = buildWaterMetadata({
      ...base,
      description: null,
      currentSignal: null,
      currentFlow: null,
    })
    expect(meta.description).toBe(
      'Latest fishing report, river flow, and conditions for Crooked River.'
    )
  })

  it('truncates the description to ~155 characters at a word boundary', () => {
    const long = 'The quick brown fox jumps over the lazy dog '.repeat(6).trim() // 250+ chars
    const meta = buildWaterMetadata({
      ...base,
      currentSignal: { compositeScore: 5, summary: long },
      currentFlow: null,
    })
    const description = meta.description ?? ''
    expect(description.length).toBeLessThanOrEqual(155)
    expect(description.endsWith('…')).toBe(true)

    // The kept content (minus the ellipsis) is a prefix of the original, cut at
    // a space — i.e. no word was sliced in half.
    const content = description.slice(0, -1)
    expect(long.startsWith(content)).toBe(true)
    expect(long[content.length]).toBe(' ')
  })

  it('sets a self-referential canonical and matching OG/Twitter tags', () => {
    const meta = buildWaterMetadata(base)
    const canonical = `${SITE_URL}/water/crooked-river`
    expect(meta.alternates?.canonical).toBe(canonical)
    expect(meta.openGraph?.url).toBe(canonical)
    expect(meta.openGraph?.title).toBe(meta.title)
    expect(meta.twitter).toMatchObject({
      card: 'summary_large_image',
      title: meta.title,
    })
  })

  it('marks the page indexable (gating to noindex is owned by #68)', () => {
    const meta = buildWaterMetadata(base)
    expect(meta.robots).toEqual({ index: true, follow: true })
  })
})

describe('buildLeaderboardMetadata', () => {
  it('builds a freshness-stamped Pacific Northwest title', () => {
    const meta = buildLeaderboardMetadata()
    expect(meta.title).toMatch(/^Pacific Northwest Fishing Report — Today's Top Waters/)
    // Month + 4-digit year (e.g. "(June 2026)") makes it read as current.
    expect(String(meta.title)).toMatch(/[A-Z][a-z]+ \d{4}\)$/)
  })

  it('uses /leaderboard as canonical and OG url', () => {
    const meta = buildLeaderboardMetadata()
    const canonical = `${SITE_URL}/leaderboard`
    expect(meta.alternates?.canonical).toBe(canonical)
    expect(meta.openGraph?.url).toBe(canonical)
  })

  it('mirrors title/description into OG and Twitter', () => {
    const meta = buildLeaderboardMetadata()
    expect(meta.openGraph?.title).toBe(meta.title)
    expect(meta.openGraph?.description).toBe(meta.description)
    expect(meta.twitter?.title).toBe(meta.title)
    expect(meta.twitter?.description).toBe(meta.description)
  })

  it('is indexable', () => {
    const meta = buildLeaderboardMetadata()
    expect(meta.robots).toEqual({ index: true, follow: true })
  })

  it('describes Pacific Northwest waters consistently with the title geography', () => {
    const meta = buildLeaderboardMetadata()
    expect(meta.description).toContain('Pacific Northwest')
  })
})

describe('buildReportsMetadata', () => {
  it('builds a freshness-stamped Pacific Northwest title', () => {
    const meta = buildReportsMetadata()
    expect(meta.title).toMatch(/^Latest Pacific Northwest Fishing Reports — /)
    // Month + 4-digit year (e.g. "June 2026") makes it read as current.
    expect(String(meta.title)).toMatch(/[A-Z][a-z]+ \d{4}$/)
  })

  it('sets a description so Google does not scrape nav/filter chrome into the snippet', () => {
    const meta = buildReportsMetadata()
    expect(meta.description).toBeTruthy()
    expect(meta.description).toContain('Pacific Northwest')
    // Keep it within the range Google reliably renders.
    expect((meta.description ?? '').length).toBeLessThanOrEqual(160)
  })

  it('uses /reports as canonical and OG url', () => {
    const meta = buildReportsMetadata()
    const canonical = `${SITE_URL}/reports`
    expect(meta.alternates?.canonical).toBe(canonical)
    expect(meta.openGraph?.url).toBe(canonical)
  })

  it('mirrors title/description into OG and Twitter', () => {
    const meta = buildReportsMetadata()
    expect(meta.openGraph?.title).toBe(meta.title)
    expect(meta.openGraph?.description).toBe(meta.description)
    expect(meta.twitter?.title).toBe(meta.title)
    expect(meta.twitter?.description).toBe(meta.description)
  })

  it('is indexable', () => {
    const meta = buildReportsMetadata()
    expect(meta.robots).toEqual({ index: true, follow: true })
  })
})
