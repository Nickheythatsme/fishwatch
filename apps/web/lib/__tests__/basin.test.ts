import { describe, it, expect, vi } from 'vitest'
import { ssrQuery } from '@/lib/graphql/execute'

type Row = Record<string, unknown>

function makeBuilder(rows: Row[]) {
  const result = { data: rows, error: null }
  const builder = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    gte: () => builder,
    order: () => builder,
    limit: () => builder,
    single: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
    then: (onfulfilled: (value: { data: Row[]; error: null }) => unknown) =>
      onfulfilled(result),
  }
  return builder
}

const yakimaBasin: Row = {
  id: '22222222-2222-2222-2222-222222222222',
  name: 'Yakima Basin',
  slug: 'yakima-basin',
  region: 'central-washington',
  description: 'Premier trout basin in Washington.',
  created_at: '2024-01-01T00:00:00.000Z',
}

const yakimaRiver: Row = {
  id: '33333333-3333-3333-3333-333333333333',
  name: 'Yakima River',
  slug: 'yakima-river',
  region: 'central-washington',
  latitude: 46.6,
  longitude: -120.5,
  description: 'A famous trout fishery.',
  typical_species: ['Yakima Cutthroat'],
  basin_id: '22222222-2222-2222-2222-222222222222',
}

const tables: Record<string, Row[]> = {
  basins: [yakimaBasin],
  water_bodies: [yakimaRiver],
  water_scores: [],
  parsed_reports: [],
  gauge_readings: [],
}

vi.mock('@/lib/graphql/context', () => ({
  createContext: () => ({
    supabase: {
      from: (table: string) => makeBuilder(tables[table] ?? []),
    },
    topSectionCache: new Map(),
  }),
}))

interface BasinResult {
  basin: {
    name: string
    slug: string
    region: string
    description: string | null
    waters: Array<{
      name: string
      slug: string
    }>
  } | null
}

interface WaterBodyBasinResult {
  waterBody: {
    name: string
    basin: {
      name: string
      slug: string
    } | null
  } | null
}

describe('basin resolvers', () => {
  it('basin(slug) returns the basin with nested waters', async () => {
    const data = await ssrQuery<BasinResult>(
      /* GraphQL */ `
        query Basin($slug: String!) {
          basin(slug: $slug) {
            name
            slug
            region
            description
            waters {
              name
              slug
            }
          }
        }
      `,
      { slug: 'yakima-basin' }
    )

    expect(data.basin).toEqual({
      name: 'Yakima Basin',
      slug: 'yakima-basin',
      region: 'central-washington',
      description: 'Premier trout basin in Washington.',
      waters: [
        {
          name: 'Yakima River',
          slug: 'yakima-river',
        },
      ],
    })
  })

  it('WaterBody.basin resolves the parent basin', async () => {
    const data = await ssrQuery<WaterBodyBasinResult>(
      /* GraphQL */ `
        query WaterBodyWithBasin($slug: String!) {
          waterBody(slug: $slug) {
            name
            basin {
              name
              slug
            }
          }
        }
      `,
      { slug: 'yakima-river' }
    )

    expect(data.waterBody?.basin).toEqual({
      name: 'Yakima Basin',
      slug: 'yakima-basin',
    })
  })
})
