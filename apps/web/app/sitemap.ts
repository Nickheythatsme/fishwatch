import type { MetadataRoute } from 'next'
import { ssrQuery } from '@/lib/graphql/execute'
import { isNoDataSignal } from '@/components/signals/score-utils'
import { SITE_URL } from '@/lib/seo/metadata'

// Regenerate the sitemap on the same cadence as the per-water pages so `lastmod`
// tracks fresh scores without rebuilding on every request.
export const revalidate = 1800

// Lists every water with its latest score so the sitemap can advertise an
// accurate `lastModified`. The publish gate below only needs the score-shaped
// fields `isNoDataSignal` inspects plus the `scoreDate` used for `lastModified`.
const SITEMAP_WATERS_QUERY = /* GraphQL */ `
  query SitemapWaters {
    waterBodies {
      slug
      currentSignal {
        scoreDate
        compositeScore
        flowScore
        sentimentScore
        consensusScore
      }
    }
  }
`

interface SitemapWater {
  slug: string
  currentSignal: {
    scoreDate: string
    compositeScore: number
    flowScore: number | null
    sentimentScore: number | null
    consensusScore: number | null
  } | null
}

interface SitemapWatersData {
  waterBodies: SitemapWater[]
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // Static, always-indexable routes.
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/leaderboard`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/reports`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ]

  let waters: SitemapWater[] = []
  try {
    const data = await ssrQuery<SitemapWatersData>(SITEMAP_WATERS_QUERY)
    waters = data.waterBodies
  } catch {
    // If the data source is unreachable, fall back to a sitemap of just the
    // static pages rather than failing the route.
    return staticEntries
  }

  const waterEntries: MetadataRoute.Sitemap = waters
    // Inline publish gate: only advertise waters that carry a real score, never a
    // NO-DATA/empty placeholder signal, so we don't point crawlers at thin pages.
    // This mirrors the per-page `isNoDataSignal` check; it will be formalized by
    // the `isPublishable(water)` helper from issue #68.
    .filter((wb) => wb.currentSignal != null && !isNoDataSignal(wb.currentSignal))
    .map((wb) => ({
      url: `${SITE_URL}/water/${wb.slug}`,
      lastModified: new Date(wb.currentSignal!.scoreDate),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    }))

  return [...staticEntries, ...waterEntries]
}
