import type { MetadataRoute } from 'next'
import { ssrQuery } from '@/lib/graphql/execute'
import { isPublishable } from '@/lib/seo/gating'
import { SITE_URL } from '@/lib/seo/metadata'

// Regenerate the sitemap on the same cadence as the per-water pages so `lastmod`
// tracks fresh scores without rebuilding on every request.
export const revalidate = 1800

// Lists every water with its latest score and most-recent report date so the
// sitemap can apply the data-completeness gate and report an accurate
// `lastModified` (freshest of scoreDate / latest report date, per issue #68).
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
      recentReports(limit: 1) {
        reportDate
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
  recentReports: Array<{ reportDate: string | null }>
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
    // Data-completeness gate: only waters with a real signal AND a fresh report
    // within PUBLISH_REPORT_WINDOW_DAYS days are advertised to crawlers (issue #68).
    // Matches the per-page robots decision in generateMetadata exactly.
    .filter((wb) =>
      isPublishable({
        signal: wb.currentSignal,
        latestReportDate: wb.recentReports[0]?.reportDate ?? null,
      })
    )
    .map((wb) => {
      // lastmod = freshest of the score date and the latest report date (issue #68 §5.2).
      const latestReportDate = wb.recentReports[0]?.reportDate ?? null
      const dates = [wb.currentSignal!.scoreDate, latestReportDate].filter(
        (d): d is string => d != null
      )
      const lastmod = dates.sort().at(-1) ?? wb.currentSignal!.scoreDate
      return {
        url: `${SITE_URL}/water/${wb.slug}`,
        lastModified: new Date(lastmod),
        changeFrequency: 'daily' as const,
        priority: 0.7,
      }
    })

  return [...staticEntries, ...waterEntries]
}
