import { describe, it, expect, vi, beforeEach } from 'vitest'

// Regression test for the Satori "Expected <div> to have explicit display:flex
// ... if it has more than one child node" error. The water OG card's score
// label rendered `{scoreLabel(score)} · out of 10`, which JSX splits into two
// child nodes inside a plain (non-flex) <div>. `next/og` (Satori) rejects that
// at render time, so EVERY /water/[slug]/opengraph-image 500'd in prod while
// the route/CI build stayed green. These tests render the actual component and
// assert a real PNG comes back, so the failure mode can't recur silently.

const ssrQueryMock = vi.fn()
vi.mock('@/lib/graphql/execute', () => ({
  ssrQuery: (...args: unknown[]) => ssrQueryMock(...args),
}))

import Image from '../opengraph-image'

async function render(slug: string) {
  const res = await Image({ params: Promise.resolve({ slug }) })
  return res as Response
}

describe('water opengraph-image', () => {
  beforeEach(() => {
    ssrQueryMock.mockReset()
  })

  it('renders a PNG when score + flow are present (the case that 500d)', async () => {
    ssrQueryMock.mockResolvedValue({
      waterBody: {
        name: 'Clackamas River',
        currentFlow: 817,
        currentSignal: {
          compositeScore: 8.1,
          flowScore: 7.5,
          sentimentScore: 8.0,
          consensusScore: 9.0,
        },
      },
    })

    const res = await render('clackamas-river')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('image/png')
  })

  it('renders a PNG for the no-data signal (score suppressed)', async () => {
    ssrQueryMock.mockResolvedValue({
      waterBody: {
        name: 'Metolius River',
        currentFlow: null,
        currentSignal: {
          compositeScore: 5.0,
          flowScore: null,
          sentimentScore: null,
          consensusScore: null,
        },
      },
    })

    const res = await render('metolius')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('image/png')
  })

  it('renders a branded fallback PNG when the query throws', async () => {
    ssrQueryMock.mockRejectedValue(new Error('db down'))

    const res = await render('some-unknown-water')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('image/png')
  })
})
