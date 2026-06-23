import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ssrQuery } from '@/lib/graphql/execute'
import { parsePair, canonicalPair, selectCuratedPairs, isPairCurated } from '@/lib/compare/pairs'
import { buildCompareMetadata, SITE_URL } from '@/lib/seo/metadata'
import { isPublishable } from '@/lib/seo/gating'
import { buildBreadcrumbList, buildItemList, assembleGraph } from '@/lib/seo/jsonld'
import { isNoDataSignal } from '@/components/signals/score-utils'
import { JsonLd } from '@/components/seo/JsonLd'
import { Breadcrumbs, type Crumb } from '@/components/shell/Breadcrumbs'
import { BackButton } from '@/components/shell/BackButton'
import { IntelligenceCard } from '@/components/intelligence/IntelligenceCard'

export const revalidate = 1800
// Allow dynamic rendering for curated pairs not yet pre-rendered; the page
// validates curation at request time and 404s for arbitrary slug combinations.
export const dynamicParams = true

// Lighter query for pre-rendering publishable pairs at build time.
const COMPARE_STATIC_QUERY = /* GraphQL */ `
  query CompareStaticParams {
    waterBodies {
      slug
      basin {
        slug
      }
      currentSignal {
        compositeScore
        flowScore
        sentimentScore
        consensusScore
      }
      recentReports(limit: 1) {
        reportDate
      }
    }
  }
`

const COMPARE_PAGE_QUERY = /* GraphQL */ `
  query ComparePage($slugA: String!, $slugB: String!) {
    waterA: waterBody(slug: $slugA) {
      id
      name
      slug
      typicalSpecies
      currentFlow
      basin {
        name
        slug
      }
      currentSignal {
        compositeScore
        flowScore
        sentimentScore
        consensusScore
        topSection
        summary
      }
      recentReports(limit: 5) {
        reportDate
        hatches {
          name
        }
      }
    }
    waterB: waterBody(slug: $slugB) {
      id
      name
      slug
      typicalSpecies
      currentFlow
      basin {
        name
        slug
      }
      currentSignal {
        compositeScore
        flowScore
        sentimentScore
        consensusScore
        topSection
        summary
      }
      recentReports(limit: 5) {
        reportDate
        hatches {
          name
        }
      }
    }
  }
`

interface CompareStaticWater {
  slug: string
  basin: { slug: string } | null
  currentSignal: {
    compositeScore: number
    flowScore: number | null
    sentimentScore: number | null
    consensusScore: number | null
  } | null
  recentReports: Array<{ reportDate: string | null }>
}

interface CompareStaticData {
  waterBodies: CompareStaticWater[]
}

interface CompareWater {
  id: string
  name: string
  slug: string
  typicalSpecies: string[]
  currentFlow: number | null
  basin: { name: string; slug: string } | null
  currentSignal: {
    compositeScore: number
    flowScore: number | null
    sentimentScore: number | null
    consensusScore: number | null
    topSection: string | null
    summary: string | null
  } | null
  recentReports: Array<{
    reportDate: string | null
    hatches: Array<{ name: string }>
  }>
}

interface ComparePageData {
  waterA: CompareWater | null
  waterB: CompareWater | null
}

export async function generateStaticParams() {
  try {
    const data = await ssrQuery<CompareStaticData>(COMPARE_STATIC_QUERY)
    const waters = data.waterBodies
    const pairs = selectCuratedPairs(waters)
    return pairs
      .filter(({ slugA, slugB }) => {
        const a = waters.find((w) => w.slug === slugA)
        const b = waters.find((w) => w.slug === slugB)
        if (!a || !b) return false
        return (
          isPublishable({
            signal: a.currentSignal,
            latestReportDate: a.recentReports[0]?.reportDate ?? null,
          }) &&
          isPublishable({
            signal: b.currentSignal,
            latestReportDate: b.recentReports[0]?.reportDate ?? null,
          })
        )
      })
      .map(({ slugA, slugB }) => ({ pair: `${slugA}-vs-${slugB}` }))
  } catch {
    // If unreachable at build time, rely on on-demand rendering (dynamicParams=true).
    return []
  }
}

function computeVerdict(
  waterA: CompareWater,
  waterB: CompareWater
): { text: string; winnerName: string | null } {
  const sigA = waterA.currentSignal
  const sigB = waterB.currentSignal
  const noDataA = isNoDataSignal(sigA)
  const noDataB = isNoDataSignal(sigB)

  if ((!sigA || noDataA) && (!sigB || noDataB)) {
    return {
      text: 'No current conditions data is available for either water.',
      winnerName: null,
    }
  }
  if (!sigA || noDataA) {
    return {
      text: `${waterB.name} is the better bet today — ${waterA.name} has no current data.`,
      winnerName: waterB.name,
    }
  }
  if (!sigB || noDataB) {
    return {
      text: `${waterA.name} is the better bet today — ${waterB.name} has no current data.`,
      winnerName: waterA.name,
    }
  }

  const diff = Math.abs(sigA.compositeScore - sigB.compositeScore)
  if (diff < 0.5) {
    return {
      text: `${waterA.name} and ${waterB.name} are fishing comparably right now (${sigA.compositeScore.toFixed(1)} vs. ${sigB.compositeScore.toFixed(1)}).`,
      winnerName: null,
    }
  }

  if (sigA.compositeScore >= sigB.compositeScore) {
    return {
      text: `${waterA.name} is fishing better today — ${sigA.compositeScore.toFixed(1)} vs. ${waterB.name}'s ${sigB.compositeScore.toFixed(1)}.`,
      winnerName: waterA.name,
    }
  }
  return {
    text: `${waterB.name} is fishing better today — ${sigB.compositeScore.toFixed(1)} vs. ${waterA.name}'s ${sigA.compositeScore.toFixed(1)}.`,
    winnerName: waterB.name,
  }
}

async function fetchPair(slugA: string, slugB: string) {
  return ssrQuery<ComparePageData>(COMPARE_PAGE_QUERY, { slugA, slugB })
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pair: string }>
}): Promise<Metadata> {
  const { pair } = await params
  const parsed = parsePair(pair)
  if (!parsed) return {}

  const canonical = canonicalPair(parsed.slugA, parsed.slugB)

  let data: ComparePageData
  try {
    data = await fetchPair(canonical.slugA, canonical.slugB)
  } catch {
    return {}
  }

  const { waterA, waterB } = data
  if (!waterA || !waterB) return {}
  if (!isPairCurated(waterA, waterB)) return {}

  const { winnerName } = computeVerdict(waterA, waterB)

  const publishable =
    isPublishable({
      signal: waterA.currentSignal,
      latestReportDate: waterA.recentReports[0]?.reportDate ?? null,
    }) &&
    isPublishable({
      signal: waterB.currentSignal,
      latestReportDate: waterB.recentReports[0]?.reportDate ?? null,
    })

  const meta = buildCompareMetadata({
    nameA: waterA.name,
    nameB: waterB.name,
    slugA: canonical.slugA,
    slugB: canonical.slugB,
    winnerName,
  })
  if (!publishable) {
    meta.robots = { index: false, follow: true }
  }
  return meta
}

// ---------------------------------------------------------------------------
// Column component (server component — no interactivity required here)
// ---------------------------------------------------------------------------

function ScoreRow({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null
  return (
    <div className="flex items-center justify-between font-body text-sm">
      <span className="text-on-surface-variant">{label}</span>
      <span className="font-semibold tabular-nums text-on-surface">{value.toFixed(1)}/10</span>
    </div>
  )
}

function CompareColumn({ water }: { water: CompareWater }) {
  const signal = water.currentSignal
  const noData = isNoDataSignal(signal)

  const hatchNames = Array.from(
    new Set(water.recentReports.flatMap((r) => r.hatches.map((h) => h.name)))
  ).slice(0, 5)

  return (
    <div className="space-y-4">
      <IntelligenceCard waterBody={water} />

      {signal && !noData && signal.summary && (
        <p className="pl-1 font-body text-xs italic text-on-surface-variant">
          &ldquo;{signal.summary}&rdquo;
        </p>
      )}

      {signal && !noData && (
        <div className="space-y-2 rounded-xl bg-surface-container-low px-4 py-3">
          <ScoreRow label="Flow" value={signal.flowScore} />
          <ScoreRow label="Angler reports" value={signal.sentimentScore} />
          <ScoreRow label="Consensus" value={signal.consensusScore} />
        </div>
      )}

      {hatchNames.length > 0 && (
        <div className="rounded-xl bg-surface-container-low px-4 py-3">
          <p className="mb-2 font-label text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Recent Hatches
          </p>
          <div className="flex flex-wrap gap-1.5">
            {hatchNames.map((name) => (
              <span
                key={name}
                className="rounded-full bg-surface-container px-2.5 py-0.5 font-label text-xs text-on-surface"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1 pl-1">
        <Link
          href={`/water/${water.slug}`}
          className="block font-label text-sm font-semibold text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
        >
          Full {water.name} report →
        </Link>
        {water.basin && (
          <Link
            href={`/basin/${water.basin.slug}`}
            className="block font-label text-xs text-on-surface-variant hover:text-on-surface focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-container"
          >
            {water.basin.name}
          </Link>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ComparePage({
  params,
}: {
  params: Promise<{ pair: string }>
}) {
  const { pair } = await params

  const parsed = parsePair(pair)
  if (!parsed) notFound()

  // Redirect to canonical order (slugA ≤ slugB) so there is one authoritative URL.
  const canonical = canonicalPair(parsed.slugA, parsed.slugB)
  const canonicalParam = `${canonical.slugA}-vs-${canonical.slugB}`
  if (pair !== canonicalParam) {
    redirect(`/compare/${canonicalParam}`)
  }

  let data: ComparePageData
  try {
    data = await fetchPair(canonical.slugA, canonical.slugB)
  } catch {
    notFound()
  }

  const { waterA, waterB } = data
  if (!waterA || !waterB) notFound()
  if (!isPairCurated(waterA, waterB)) notFound()

  const { text: verdictText } = computeVerdict(waterA, waterB)

  // Deep-copy to plain objects for the Server→Client boundary. graphql-js
  // returns null-prototype objects, which React cannot serialize from a Server
  // Component into a Client Component — every nested object/array (basin,
  // currentSignal, recentReports → hatches, typicalSpecies) must be rebuilt as
  // a plain object. (Same gotcha documented in /basin and /water pages.)
  const toPlainWater = (w: CompareWater): CompareWater => ({
    id: w.id,
    name: w.name,
    slug: w.slug,
    typicalSpecies: [...w.typicalSpecies],
    currentFlow: w.currentFlow,
    basin: w.basin ? { name: w.basin.name, slug: w.basin.slug } : null,
    currentSignal: w.currentSignal ? { ...w.currentSignal } : null,
    recentReports: w.recentReports.map((r) => ({
      reportDate: r.reportDate,
      hatches: r.hatches.map((h) => ({ name: h.name })),
    })),
  })
  const wA: CompareWater = toPlainWater(waterA)
  const wB: CompareWater = toPlainWater(waterB)

  const breadcrumbs: Crumb[] = [
    { label: 'Home', href: '/' },
    { label: 'Compare' },
    { label: `${waterA.name} vs. ${waterB.name}` },
  ]

  const jsonLd = assembleGraph([
    buildBreadcrumbList(breadcrumbs, SITE_URL),
    buildItemList(
      [
        { name: waterA.name, slug: waterA.slug },
        { name: waterB.name, slug: waterB.slug },
      ],
      SITE_URL,
      `${waterA.name} vs. ${waterB.name}`
    ),
  ])

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-24 md:pb-8">
      {jsonLd && <JsonLd data={jsonLd} />}
      <BackButton className="mb-4 md:hidden" />
      <Breadcrumbs items={breadcrumbs} className="mb-4" />

      <section className="rounded-2xl bg-surface-container-low p-6 sm:p-8">
        <p className="font-label text-xs font-bold uppercase tracking-[0.2em] text-secondary">
          Head to Head
        </p>
        <h1 className="mt-1 font-headline text-3xl font-bold italic text-on-surface">
          {waterA.name} vs. {waterB.name}
        </h1>
        <p className="mt-3 rounded-xl bg-surface-container px-4 py-3 font-body text-sm leading-relaxed text-on-surface">
          {verdictText}
        </p>
      </section>

      <section
        className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2"
        aria-label={`${waterA.name} vs. ${waterB.name} comparison`}
      >
        <CompareColumn water={wA} />
        <CompareColumn water={wB} />
      </section>
    </div>
  )
}
