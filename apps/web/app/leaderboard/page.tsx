import type { Metadata } from 'next'
import { ssrQuery } from '@/lib/graphql/execute'
import { IntelligenceCard } from '@/components/intelligence/IntelligenceCard'
import { isNoDataSignal } from '@/components/signals/score-utils'
import { JsonLd } from '@/components/seo/JsonLd'
import { buildItemList, assembleGraph } from '@/lib/seo/jsonld'
import { buildLeaderboardMetadata, SITE_URL } from '@/lib/seo/metadata'

export const revalidate = 1800

export function generateMetadata(): Metadata {
  return buildLeaderboardMetadata()
}

const LEADERBOARD_QUERY = /* GraphQL */ `
  query Leaderboard {
    waterBodies {
      id
      name
      slug
      typicalSpecies
      currentFlow
      currentSignal {
        compositeScore
        flowScore
        sentimentScore
        consensusScore
        topSection
      }
    }
  }
`

interface LeaderboardWaterBody {
  id: string
  name: string
  slug: string
  typicalSpecies: string[]
  currentFlow: number | null
  currentSignal: {
    compositeScore: number
    flowScore: number | null
    sentimentScore: number | null
    consensusScore: number | null
    topSection: string | null
  } | null
}

interface LeaderboardData {
  waterBodies: LeaderboardWaterBody[]
}

function ErrorState() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <p className="rounded-2xl bg-error-container/30 p-6 text-error">
        Failed to load leaderboard. Please try again.
      </p>
    </div>
  )
}

export default async function LeaderboardPage() {
  let data: LeaderboardData
  try {
    data = await ssrQuery<LeaderboardData>(LEADERBOARD_QUERY)
  } catch {
    return <ErrorState />
  }

  // graphql-js null-prototype fix: copy into plain objects before passing to
  // client components across the Server→Client boundary.
  const allWaters: LeaderboardWaterBody[] = data.waterBodies.map((wb) => ({
    ...wb,
    currentSignal: wb.currentSignal ? { ...wb.currentSignal } : null,
  }))

  // Exclude no-data / gated waters — only rank waters with a real composite score.
  const rankedWaters = allWaters
    .filter((wb) => wb.currentSignal != null && !isNoDataSignal(wb.currentSignal))
    .sort((a, b) => b.currentSignal!.compositeScore - a.currentSignal!.compositeScore)

  const jsonLd = assembleGraph([buildItemList(rankedWaters, SITE_URL)])

  return (
    <>
      {jsonLd && <JsonLd data={jsonLd} />}
      <main className="mx-auto max-w-3xl px-6 py-8 pb-24 md:pb-8">
        <header className="mb-8">
          <p className="font-label text-xs font-bold uppercase tracking-[0.2em] text-secondary">
            Current Intelligence
          </p>
          <h1 className="mt-1 font-headline text-3xl font-bold italic text-on-surface">
            Today&apos;s Top Waters
          </h1>
          <p className="mt-2 font-body text-sm leading-relaxed text-outline">
            Ranked by composite fishing score · Updated every 30 minutes
          </p>
        </header>
        {rankedWaters.length === 0 ? (
          <p className="font-body text-sm text-on-surface-variant">
            No scored waters available yet. Check back soon.
          </p>
        ) : (
          <ol className="space-y-3">
            {rankedWaters.map((wb, i) => (
              <li key={wb.id} className="flex items-start gap-4">
                <span
                  aria-label={`Rank ${i + 1}`}
                  className="mt-4 w-7 shrink-0 text-right font-headline text-lg font-bold text-on-surface-variant"
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <IntelligenceCard waterBody={wb} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </main>
    </>
  )
}
