import { describe, it, expect, vi } from 'vitest'
// `vi.mock` is hoisted above imports, so the static `ssrQuery` import below
// already picks up the stubbed context.
import { ssrQuery } from '@/lib/graphql/execute'

// A minimal, chainable stand-in for the Supabase query builder. Every filter
// method returns the same builder; awaiting it (or calling `.single()`) yields a
// canned `{ data, error }` result. This lets the real resolvers run end-to-end
// through the schema without any network/database access.
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

const lowerDeschutes: Row = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Lower Deschutes',
  slug: 'lower-deschutes',
  region: 'central-oregon',
  latitude: 45.63,
  longitude: -120.91,
  description: 'Blue-ribbon trout and summer steelhead.',
  typical_species: ['Redband Trout', 'Steelhead'],
}

const tables: Record<string, Row[]> = {
  water_bodies: [lowerDeschutes],
}

vi.mock('@/lib/graphql/context', () => ({
  createContext: () => ({
    supabase: {
      from: (table: string) => makeBuilder(tables[table] ?? []),
    },
    topSectionCache: new Map(),
  }),
}))

interface WaterBodyResult {
  waterBody: {
    name: string
    slug: string
    region: string
    typicalSpecies: string[]
  } | null
}

describe('ssrQuery', () => {
  it('resolves a query in-process with no HTTP call', async () => {
    const data = await ssrQuery<WaterBodyResult>(
      /* GraphQL */ `
        query WaterBody($slug: String!) {
          waterBody(slug: $slug) {
            name
            slug
            region
            typicalSpecies
          }
        }
      `,
      { slug: 'lower-deschutes' }
    )

    expect(data.waterBody).toEqual({
      name: 'Lower Deschutes',
      slug: 'lower-deschutes',
      region: 'central-oregon',
      // Field resolver maps snake_case `typical_species` -> camelCase.
      typicalSpecies: ['Redband Trout', 'Steelhead'],
    })
  })

  it('throws when the query is invalid', async () => {
    await expect(
      ssrQuery(/* GraphQL */ `{ nonexistentField }`)
    ).rejects.toThrow(/nonexistentField/)
  })
})
