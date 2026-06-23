import { describe, it, expect } from 'vitest'
import type { Graph } from 'schema-dts'
import {
  buildWaterPageGraph,
  buildFaqPage,
  buildItemList,
  type WaterPageGraphInput,
  type FaqInput,
  type ItemListEntry,
} from '@/lib/seo/jsonld'

const SITE_URL = 'https://score.fish'

// A water with every section populated.
const fullInput: WaterPageGraphInput = {
  water: {
    name: 'Crooked River',
    slug: 'crooked-river',
    author: 'Pat Angler',
    editorialNotes: 'Tailwater below Bowman Dam. Nymph deep in winter.',
  },
  crumbs: [{ label: 'Home', href: '/' }, { label: 'Crooked River' }],
  signal: {
    compositeScore: 7.4,
    summary: 'Steady flows and strong BWO activity have fish looking up.',
    recommendedFlies: ['Zebra Midge', 'Pheasant Tail'],
    scoreDate: '2026-06-20',
  },
  hatches: [
    { name: 'Blue Winged Olive', stage: 'adult', timing: 'afternoon' },
    { name: 'Midge', stage: null, timing: null },
  ],
  gaugeReadings: [
    { measuredAt: '2026-06-20T06:00:00Z', flowCfs: 140, waterTempF: 52, gaugeHeightFt: 2.1 },
    { measuredAt: '2026-06-20T18:00:00Z', flowCfs: 142, waterTempF: 55, gaugeHeightFt: 2.2 },
  ],
  sourceCredits: [
    { sourceName: 'confluence_fly_shop', label: 'Confluence Fly Shop', url: 'https://confluence.example' },
    { sourceName: 'no_url_shop', label: 'No Url Shop', url: null },
  ],
  lastUpdated: '2026-06-21',
  siteUrl: SITE_URL,
}

// Find nodes in the @graph by @type, returned as loosely-typed records so the
// assertions below can read schema.org fields without per-field schema-dts casts.
function nodesOfType(graph: Graph, type: string): Array<Record<string, unknown>> {
  const all = graph['@graph'] as ReadonlyArray<unknown>
  return all.filter(
    (n): n is Record<string, unknown> =>
      typeof n === 'object' &&
      n != null &&
      (n as Record<string, unknown>)['@type'] === type
  )
}

describe('buildWaterPageGraph — full data', () => {
  const graph = buildWaterPageGraph(fullInput)

  it('emits a schema.org @graph', () => {
    expect(graph).not.toBeNull()
    expect(graph?.['@context']).toBe('https://schema.org')
    expect(Array.isArray(graph?.['@graph'])).toBe(true)
  })

  it('includes a BreadcrumbList mirroring the crumb trail', () => {
    const [bc] = nodesOfType(graph!, 'BreadcrumbList')
    expect(bc).toBeDefined()
    const items = bc.itemListElement as Array<{ name: string; item?: string }>
    expect(items.map((i) => i.name)).toEqual(['Home', 'Crooked River'])
    // Home resolves to an absolute URL; the current page (no href) has no item.
    expect(items[0].item).toBe('https://score.fish/')
    expect(items[1].item).toBeUndefined()
  })

  it('includes a Dataset with flow, temp, height, and score variables', () => {
    const [ds] = nodesOfType(graph!, 'Dataset')
    expect(ds).toBeDefined()
    const vars = ds.variableMeasured as Array<{ name: string; value: number; unitCode?: string }>
    const byName = Object.fromEntries(vars.map((v) => [v.name, v]))
    expect(byName['Streamflow'].value).toBe(142) // latest reading wins
    expect(byName['Water temperature'].value).toBe(55)
    expect(byName['Water temperature'].unitCode).toBe('FAH')
    expect(byName['Gauge height'].unitCode).toBe('FOT')
    expect(byName['Fishing conditions score'].value).toBe(7.4)
  })

  it('includes a FAQPage with all three answerable questions', () => {
    const [faq] = nodesOfType(graph!, 'FAQPage')
    const questions = faq.mainEntity as Array<{ name: string }>
    expect(questions).toHaveLength(3)
    expect(questions.map((q) => q.name)).toEqual([
      'Is Crooked River fishing well right now?',
      "What's hatching on Crooked River?",
      'What flies are working on Crooked River?',
    ])
  })

  it('includes an Article attributed to the author', () => {
    const [article] = nodesOfType(graph!, 'Article')
    expect((article.author as { name: string }).name).toBe('Pat Angler')
    expect(article.articleBody as string).toContain('Bowman Dam')
  })

  it('includes a LocalBusiness only for credits that have a URL', () => {
    const shops = nodesOfType(graph!, 'LocalBusiness')
    expect(shops).toHaveLength(1)
    expect(shops[0].name as string).toBe('Confluence Fly Shop')
  })
})

describe('buildWaterPageGraph — sparse data omits nodes', () => {
  const sparse: WaterPageGraphInput = {
    water: { name: 'Empty Creek', slug: 'empty-creek', author: null, editorialNotes: null },
    crumbs: [{ label: 'Home', href: '/' }, { label: 'Empty Creek' }],
    signal: null,
    hatches: [],
    gaugeReadings: [],
    sourceCredits: [],
    lastUpdated: null,
    siteUrl: SITE_URL,
  }
  const graph = buildWaterPageGraph(sparse)

  it('still emits a graph (breadcrumbs always present)', () => {
    expect(graph).not.toBeNull()
  })

  it('omits Dataset, FAQPage, Article, and LocalBusiness when data is missing', () => {
    expect(nodesOfType(graph!, 'BreadcrumbList')).toHaveLength(1)
    expect(nodesOfType(graph!, 'Dataset')).toHaveLength(0)
    expect(nodesOfType(graph!, 'FAQPage')).toHaveLength(0)
    expect(nodesOfType(graph!, 'Article')).toHaveLength(0)
    expect(nodesOfType(graph!, 'LocalBusiness')).toHaveLength(0)
  })
})

describe('buildWaterPageGraph — no-data signal is treated as no signal', () => {
  it('omits the FAQ "fishing well" question and the score variable', () => {
    // Caller passes signal: null for a no-data signal; FAQ falls back to hatches only.
    const graph = buildWaterPageGraph({
      ...fullInput,
      signal: null,
      gaugeReadings: [
        { measuredAt: '2026-06-20T06:00:00Z', flowCfs: 140, waterTempF: null, gaugeHeightFt: null },
      ],
    })
    const [faq] = nodesOfType(graph!, 'FAQPage')
    const questions = faq.mainEntity as Array<{ name: string }>
    expect(questions.some((q) => q.name.includes('fishing well'))).toBe(false)
    const [ds] = nodesOfType(graph!, 'Dataset')
    const vars = ds.variableMeasured as Array<{ name: string }>
    expect(vars.some((v) => v.name === 'Fishing conditions score')).toBe(false)
  })
})

describe('buildItemList', () => {
  const SITE_URL = 'https://score.fish'

  const entries: ItemListEntry[] = [
    { name: 'Deschutes River', slug: 'deschutes-river' },
    { name: 'Crooked River', slug: 'crooked-river' },
    { name: 'Metolius River', slug: 'metolius-river' },
  ]

  it('returns null for an empty entry list', () => {
    expect(buildItemList([], SITE_URL)).toBeNull()
  })

  it('returns an ItemList with the correct @type', () => {
    const list = buildItemList(entries, SITE_URL)
    expect(list).not.toBeNull()
    expect(list!['@type']).toBe('ItemList')
  })

  it('assigns 1-based positions in order', () => {
    const list = buildItemList(entries, SITE_URL)
    const items = list!.itemListElement as Array<{ position: number; name: string; url: string }>
    expect(items.map((i) => i.position)).toEqual([1, 2, 3])
  })

  it('builds canonical water URLs from slug and siteUrl', () => {
    const list = buildItemList(entries, SITE_URL)
    const items = list!.itemListElement as Array<{ url: string }>
    expect(items[0].url).toBe('https://score.fish/water/deschutes-river')
    expect(items[1].url).toBe('https://score.fish/water/crooked-river')
  })

  it('preserves the water name on each ListItem', () => {
    const list = buildItemList(entries, SITE_URL)
    const items = list!.itemListElement as Array<{ name: string }>
    expect(items.map((i) => i.name)).toEqual([
      'Deschutes River',
      'Crooked River',
      'Metolius River',
    ])
  })
})

describe('buildFaqPage — dated answers + speakable (issue #103)', () => {
  const baseFaqInput: FaqInput = {
    name: 'Crooked River',
    signal: { compositeScore: 7.4, summary: 'Fish are looking up.' },
    hatches: [{ name: 'Blue Winged Olive', stage: 'adult', timing: 'afternoon' }],
    recommendedFlies: ['Zebra Midge'],
  }

  it('adds an "as of <date>" clause to the fishing-well answer when dateModified is set', () => {
    const faq = buildFaqPage({ ...baseFaqInput, dateModified: '2026-06-21' })
    expect(faq).not.toBeNull()
    const q = (faq!.mainEntity as Array<Record<string, unknown>>).find((e) =>
      String((e as { name?: string }).name).includes('fishing well')
    )
    const answer = (q!.acceptedAnswer as { text: string }).text
    expect(answer).toContain('as of June 21, 2026')
    // scoreToLabel(7.4) → the implementation's label for that score; assert the
    // score number is present rather than hard-coding the label word.
    expect(answer).toContain('(7.4/10)')
  })

  it('omits the "as of" clause when dateModified is absent', () => {
    const faq = buildFaqPage(baseFaqInput)
    const q = (faq!.mainEntity as Array<Record<string, unknown>>).find((e) =>
      String((e as { name?: string }).name).includes('fishing well')
    )
    const answer = (q!.acceptedAnswer as { text: string }).text
    expect(answer).not.toContain('as of')
  })

  it('carries dateModified on the FAQPage node when provided', () => {
    const faq = buildFaqPage({ ...baseFaqInput, dateModified: '2026-06-21' })
    expect((faq as Record<string, unknown>).dateModified).toBe('2026-06-21')
  })

  it('adds a speakable selector targeting the lede id when ledeId is set', () => {
    const faq = buildFaqPage({ ...baseFaqInput, ledeId: 'citable-lede' })
    const speakable = (faq as Record<string, unknown>).speakable as
      | Record<string, unknown>
      | undefined
    expect(speakable).toBeDefined()
    expect(speakable!['@type']).toBe('SpeakableSpecification')
    expect(speakable!.cssSelector).toBe('#citable-lede')
  })

  it('omits speakable and dateModified when neither is provided', () => {
    const faq = buildFaqPage(baseFaqInput) as Record<string, unknown>
    expect(faq.speakable).toBeUndefined()
    expect(faq.dateModified).toBeUndefined()
  })
})
