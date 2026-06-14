import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

// Client islands that need the Next.js runtime (router / Leaflet) are stubbed —
// the point of these tests is the *server-rendered* HTML, not the islands.
vi.mock('@/components/shell/BackButton', () => ({
  BackButton: () => null,
}))
vi.mock('@/components/map/WaterBodyMiniMapIsland', () => ({
  WaterBodyMiniMapIsland: () => null,
}))

// `notFound()` throws a sentinel we can assert on, mirroring Next's behavior of
// aborting render and showing the not-found UI.
const NOT_FOUND = new Error('NEXT_NOT_FOUND')
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw NOT_FOUND
  },
}))

// A chainable Supabase stand-in. `.single()` resolves to the first row, or to a
// PostgREST-style error when the table has no matching row — which is how an
// unknown slug surfaces (the resolver does `if (error) throw error`).
type Row = Record<string, unknown>

let tables: Record<string, Row[]> = {}

function makeBuilder(rows: Row[]) {
  const result = { data: rows, error: null }
  const builder = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    gte: () => builder,
    not: () => builder,
    order: () => builder,
    limit: () => builder,
    single: () =>
      rows.length > 0
        ? Promise.resolve({ data: rows[0], error: null })
        : Promise.resolve({
            data: null,
            error: { message: 'No rows found', code: 'PGRST116' },
          }),
    then: (onfulfilled: (value: { data: Row[]; error: null }) => unknown) =>
      onfulfilled(result),
  }
  return builder
}

vi.mock('@/lib/graphql/context', () => ({
  createContext: () => ({
    supabase: {
      from: (table: string) => makeBuilder(tables[table] ?? []),
    },
    topSectionCache: new Map(),
  }),
}))

// Imported after the mocks so they pick up the stubbed modules.
import WaterBodyPage, { generateStaticParams } from '../page'

const waterBody: Row = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Lower Deschutes River',
  slug: 'lower-deschutes',
  region: 'oregon',
  latitude: 44.9572,
  longitude: -121.2695,
  description: 'Trophy water below Pelton Dam.',
  typical_species: ['rainbow trout', 'steelhead'],
}

const score: Row = {
  water_body_id: waterBody.id,
  composite_score: 8.2,
  flow_score: 7.5,
  sentiment_score: 8.0,
  consensus_score: 9.0,
  recommended_species: ['rainbow trout'],
  recommended_flies: ['Pat’s Rubber Legs'],
  summary: 'Redsides eating well on the swing.',
  score_date: '2026-06-14',
  top_section: 'Warm Springs to Trout Creek',
}

const reading: Row = {
  water_body_id: waterBody.id,
  measured_at: '2026-06-14T12:00:00Z',
  flow_cfs: 4200,
  water_temp_f: 54,
  gauge_height_ft: 3.1,
}

const report: Row = {
  id: 'r1',
  water_body_id: waterBody.id,
  source_name: 'Deschutes Angler',
  source_url: 'https://example.com',
  report_date: '2026-06-13',
  sentiment: 'good',
  conditions_summary: 'Salmonflies are popping near Maupin.',
  fly_patterns_mentioned: ['Chubby Chernobyl'],
  species_mentioned: ['rainbow trout'],
  water_clarity: 'clear',
}

beforeEach(() => {
  tables = {
    water_bodies: [waterBody],
    water_scores: [score],
    gauge_readings: [reading],
    parsed_reports: [report],
  }
})

describe('water/[slug] page', () => {
  it('server-renders the score, summary, flow, and report text into HTML', async () => {
    const element = await WaterBodyPage({ params: { slug: 'lower-deschutes' } })
    const html = renderToStaticMarkup(element)

    expect(html).toContain('Lower Deschutes River')
    expect(html).toContain('8.2') // composite score
    expect(html).toContain('Redsides eating well on the swing.') // summary
    expect(html).toContain('4,200') // current flow, cfs formatted
    expect(html).toContain('cfs')
    expect(html).toContain('Salmonflies are popping near Maupin.') // report text
  })

  it('calls notFound() for an unknown slug', async () => {
    tables = { water_bodies: [] }
    await expect(WaterBodyPage({ params: { slug: 'does-not-exist' } })).rejects.toBe(
      NOT_FOUND
    )
  })

  it('generateStaticParams returns the Oregon water slugs', async () => {
    tables = {
      water_bodies: [waterBody, { ...waterBody, slug: 'metolius' }],
    }
    const params = await generateStaticParams()
    expect(params).toEqual([{ slug: 'lower-deschutes' }, { slug: 'metolius' }])
  })
})
