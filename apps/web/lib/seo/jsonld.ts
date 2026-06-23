import type {
  Article,
  BreadcrumbList,
  Dataset,
  FAQPage,
  Graph,
  ListItem,
  LocalBusiness,
  PropertyValue,
  Question,
  Thing,
} from 'schema-dts'
import type { Crumb } from '@/components/shell/Breadcrumbs'
import type { Hatch } from '@/components/reports/HatchTable'
import type { SourceCredit } from '@/components/reports/source-utils'
import { scoreToLabel } from '@/components/signals/score-utils'
import { formatDate } from './citableLede'

/**
 * Typed schema.org (JSON-LD) builders for the per-water page.
 *
 * Each builder mirrors content that is actually rendered on the page and returns
 * `null` (or an empty list) when the backing data is missing, so the assembled
 * `@graph` never contains empty or placeholder nodes. The page feeds these the
 * SAME variables it renders, so the structured data can't drift from the visible
 * page. See issue #62.
 */

const ORGANIZATION_NAME = 'Score.Fish'

function waterUrl(slug: string, siteUrl: string): string {
  return `${siteUrl}/water/${slug}`
}

// ---------------------------------------------------------------------------
// 2.1 core: BreadcrumbList + conditions Dataset
// ---------------------------------------------------------------------------

/**
 * `BreadcrumbList` built from the page's existing breadcrumb trail, so the
 * structured data and the rendered `<Breadcrumbs>` share one source of truth.
 * Relative crumb hrefs (`/`) resolve against the canonical origin; the current
 * page's crumb has no href and so emits no `item` (per Google's guidance the
 * last breadcrumb doesn't need a URL).
 */
export function buildBreadcrumbList(crumbs: Crumb[], siteUrl: string): BreadcrumbList {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, i): ListItem => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.label,
      ...(crumb.href ? { item: new URL(crumb.href, siteUrl).toString() } : {}),
    })),
  }
}

export interface GaugeReadingInput {
  measuredAt: string
  flowCfs: number | null
  waterTempF: number | null
  gaugeHeightFt: number | null
}

export interface ConditionsDatasetInput {
  name: string
  slug: string
  readings: GaugeReadingInput[]
  /** Composite fishing score (0–10) — included only for a real (non-no-data) signal. */
  compositeScore?: number | null
}

// Most recent non-null value for a single measured variable. `measuredAt` is an
// ISO 8601 timestamp, so a lexicographic comparison is also chronological.
function latestReading(
  readings: GaugeReadingInput[],
  pick: (r: GaugeReadingInput) => number | null
): { value: number; at: string } | null {
  let best: { value: number; at: string } | null = null
  for (const r of readings) {
    const v = pick(r)
    if (v == null) continue
    if (best == null || r.measuredAt > best.at) best = { value: v, at: r.measuredAt }
  }
  return best
}

/**
 * `Dataset` describing the gauge readings (last 48h) and current fishing score.
 * `variableMeasured` carries the latest value + units for each metric, with
 * UN/CEFACT `unitCode`s where a standard code exists (degree Fahrenheit, foot).
 * Streamflow has no widely-used Common Code, so it carries `unitText` only.
 * Returns `null` when there are no readings, mirroring the page which renders no
 * flow data in that case.
 */
export function buildConditionsDataset(
  input: ConditionsDatasetInput,
  siteUrl: string
): Dataset | null {
  const { readings } = input
  if (readings.length === 0) return null

  const variableMeasured: PropertyValue[] = []

  const flow = latestReading(readings, (r) => r.flowCfs)
  if (flow) {
    variableMeasured.push({
      '@type': 'PropertyValue',
      name: 'Streamflow',
      unitText: 'cubic feet per second',
      value: flow.value,
    })
  }

  const temp = latestReading(readings, (r) => r.waterTempF)
  if (temp) {
    variableMeasured.push({
      '@type': 'PropertyValue',
      name: 'Water temperature',
      unitCode: 'FAH',
      unitText: 'degree Fahrenheit',
      value: temp.value,
    })
  }

  const height = latestReading(readings, (r) => r.gaugeHeightFt)
  if (height) {
    variableMeasured.push({
      '@type': 'PropertyValue',
      name: 'Gauge height',
      unitCode: 'FOT',
      unitText: 'foot',
      value: height.value,
    })
  }

  if (input.compositeScore != null) {
    variableMeasured.push({
      '@type': 'PropertyValue',
      name: 'Fishing conditions score',
      unitText: 'score (0–10)',
      value: input.compositeScore,
      minValue: 0,
      maxValue: 10,
    })
  }

  // Every reading was all-null (no flow/temp/height) and no score — nothing to describe.
  if (variableMeasured.length === 0) return null

  let earliest = readings[0].measuredAt
  let latest = readings[0].measuredAt
  for (const r of readings) {
    if (r.measuredAt < earliest) earliest = r.measuredAt
    if (r.measuredAt > latest) latest = r.measuredAt
  }

  const canonical = waterUrl(input.slug, siteUrl)
  return {
    '@type': 'Dataset',
    '@id': `${canonical}#conditions`,
    name: `${input.name} streamflow and fishing conditions`,
    description: `Recent streamflow, water temperature, and fishing conditions for ${input.name}, from USGS gauge readings and fishing reports.`,
    url: canonical,
    variableMeasured,
    temporalCoverage: `${earliest}/${latest}`,
    dateModified: latest,
    isAccessibleForFree: true,
    creator: { '@type': 'Organization', name: ORGANIZATION_NAME, url: siteUrl },
  }
}

// ---------------------------------------------------------------------------
// 2.2 FAQPage
// ---------------------------------------------------------------------------

export interface FaqInput {
  name: string
  /** A real (non-no-data) current signal, or null. */
  signal: { compositeScore: number; summary: string | null } | null
  /** Deduped hatches (same list the page's HatchTable renders). */
  hatches: Hatch[]
  /** Recommended flies from the current signal (same list the page renders). */
  recommendedFlies: string[]
  /** Freshest date for the page's data (YYYY-MM-DD) — added to the FAQ node and the answer text. */
  dateModified?: string | null
  /** Element id of the citable lede `<p>` when rendered — enables speakable schema. */
  ledeId?: string | null
}

function faqEntry(name: string, text: string): Question {
  return {
    '@type': 'Question',
    name,
    acceptedAnswer: { '@type': 'Answer', text },
  }
}

function describeHatch(h: Hatch): string {
  const detail = [h.stage, h.timing].filter((d): d is string => Boolean(d)).join(', ')
  return detail ? `${h.name} (${detail})` : h.name
}

/**
 * `FAQPage` built ONLY from questions the page can genuinely answer — no
 * boilerplate or empty answers (which read as thin content). Each Q&A is gated
 * on its backing data existing. Returns `null` when no question can be answered.
 *
 * When `dateModified` is provided, the FAQ node carries a timestamp and the
 * "fishing well" answer includes an "as of" clause so each answer is
 * independently dated. When `ledeId` is provided, a `speakable` selector is
 * added targeting the citable lede `<p>` on the page.
 */
export function buildFaqPage(input: FaqInput): FAQPage | null {
  const questions: Question[] = []

  if (input.signal) {
    const label = scoreToLabel(input.signal.compositeScore)
    const score = `${label} (${input.signal.compositeScore.toFixed(1)}/10)`
    const dateSuffix = input.dateModified
      ? ` (as of ${formatDate(input.dateModified)})`
      : ''
    const answer = input.signal.summary
      ? `${input.signal.summary} Current conditions rate as ${score}${dateSuffix}.`
      : `Current conditions on ${input.name} rate as ${score}${dateSuffix}.`
    questions.push(faqEntry(`Is ${input.name} fishing well right now?`, answer))
  }

  if (input.hatches.length > 0) {
    const list = input.hatches.map(describeHatch).join(', ')
    questions.push(
      faqEntry(`What's hatching on ${input.name}?`, `Recent reports mention ${list}.`)
    )
  }

  if (input.recommendedFlies.length > 0) {
    questions.push(
      faqEntry(
        `What flies are working on ${input.name}?`,
        `Patterns worth trying on ${input.name} right now: ${input.recommendedFlies.join(', ')}.`
      )
    )
  }

  if (questions.length === 0) return null

  return {
    '@type': 'FAQPage',
    mainEntity: questions,
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
    ...(input.ledeId
      ? {
          speakable: {
            '@type': 'SpeakableSpecification' as const,
            cssSelector: `#${input.ledeId}`,
          },
        }
      : {}),
  } as FAQPage
}

// ---------------------------------------------------------------------------
// 2.3 Article + author, and LocalBusiness source credits
// ---------------------------------------------------------------------------

export interface ArticleInput {
  name: string
  slug: string
  /** Caller guarantees this is present — Article is omitted entirely otherwise. */
  author: string
  /** Editorial notes (preferred) or the signal summary. */
  body: string | null
  datePublished: string | null
  dateModified: string | null
}

/**
 * `Article` attributed to the local author. Built only when `wb.author` is
 * present (the page renders the "Local Notes" byline under the same condition).
 */
export function buildArticle(input: ArticleInput, siteUrl: string): Article {
  const canonical = waterUrl(input.slug, siteUrl)
  return {
    '@type': 'Article',
    '@id': `${canonical}#article`,
    headline: `${input.name} Fishing Report & Conditions`,
    author: { '@type': 'Person', name: input.author },
    publisher: { '@type': 'Organization', name: ORGANIZATION_NAME, url: siteUrl },
    mainEntityOfPage: canonical,
    url: canonical,
    ...(input.body ? { description: input.body, articleBody: input.body } : {}),
    ...(input.datePublished ? { datePublished: input.datePublished } : {}),
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
  }
}

/**
 * `LocalBusiness` nodes for the credited source shops — derived from the same
 * `deriveSourceCredits(recentReports)` the page renders as attribution. Only
 * credits that have a homepage URL are emitted (the link target IS the node id).
 */
export function buildSourceBusinesses(credits: SourceCredit[]): LocalBusiness[] {
  const out: LocalBusiness[] = []
  for (const credit of credits) {
    if (!credit.url) continue
    out.push({
      '@type': 'LocalBusiness',
      '@id': credit.url,
      name: credit.label,
      url: credit.url,
    })
  }
  return out
}

// ---------------------------------------------------------------------------
// Graph assembly
// ---------------------------------------------------------------------------

/**
 * Collect whichever builder outputs are non-empty into a single schema.org
 * `@graph`. Returns `null` when nothing was produced (so the page emits no
 * script tag at all rather than an empty graph).
 */
export function assembleGraph(nodes: Array<Thing | null | undefined>): Graph | null {
  const graph = nodes.filter((n): n is Thing => Boolean(n))
  if (graph.length === 0) return null
  return { '@context': 'https://schema.org', '@graph': graph }
}

export interface WaterPageGraphInput {
  water: {
    name: string
    slug: string
    author: string | null
    editorialNotes: string | null
  }
  crumbs: Crumb[]
  /** The current signal ONLY when it's real (not a no-data placeholder), else null. */
  signal: {
    compositeScore: number
    summary: string | null
    recommendedFlies: string[]
    scoreDate: string | null
  } | null
  /** Deduped hatch list (same one HatchTable renders). */
  hatches: Hatch[]
  gaugeReadings: GaugeReadingInput[]
  /** Source credits (same ones SourceAttribution renders). */
  sourceCredits: SourceCredit[]
  /** Freshest of score date / latest report date — the page's "Last updated" stamp. */
  lastUpdated: string | null
  siteUrl: string
  /** Element id of the citable lede `<p>` when it is rendered — enables speakable schema on the FAQPage node. */
  ledeId?: string | null
}

/**
 * Top-level orchestrator: run every builder against the page's data, guard each
 * node on the data it needs, and assemble a single `@graph`. The page calls this
 * once and renders the result via `<JsonLd>`.
 */
export function buildWaterPageGraph(input: WaterPageGraphInput): Graph | null {
  const { water, crumbs, signal, hatches, gaugeReadings, sourceCredits, lastUpdated, siteUrl, ledeId } =
    input

  const breadcrumb = buildBreadcrumbList(crumbs, siteUrl)

  const dataset = buildConditionsDataset(
    {
      name: water.name,
      slug: water.slug,
      readings: gaugeReadings,
      compositeScore: signal?.compositeScore ?? null,
    },
    siteUrl
  )

  const faq = buildFaqPage({
    name: water.name,
    signal: signal ? { compositeScore: signal.compositeScore, summary: signal.summary } : null,
    hatches,
    recommendedFlies: signal?.recommendedFlies ?? [],
    dateModified: lastUpdated,
    ledeId: ledeId ?? null,
  })

  const article = water.author
    ? buildArticle(
        {
          name: water.name,
          slug: water.slug,
          author: water.author,
          body: water.editorialNotes ?? signal?.summary ?? null,
          datePublished: signal?.scoreDate ?? lastUpdated,
          dateModified: lastUpdated ?? signal?.scoreDate ?? null,
        },
        siteUrl
      )
    : null

  const businesses = buildSourceBusinesses(sourceCredits)

  return assembleGraph([breadcrumb, dataset, faq, article, ...businesses])
}
