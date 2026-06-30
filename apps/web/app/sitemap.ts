import type { MetadataRoute } from 'next'
import { ssrQuery } from '@/lib/graphql/execute'
import { isPublishable } from '@/lib/seo/gating'
import { SITE_URL } from '@/lib/seo/metadata'
import { TOWNS, MAX_NEAR_DISTANCE_MILES } from '@/lib/near/towns'
import { haversineDistanceMiles } from '@/lib/near/haversine'
import { selectCuratedPairs } from '@/lib/compare/pairs'

// Render the sitemap dynamically (live DB read) on every request instead of
// caching it as a statically-prerendered ISR route. As an ISR route the sitemap
// froze across code-unchanged deploys: a data-only pipeline run (new scores +
// reports making a water publishable) did not refresh it, because the build
// reused the cached prerender of this unchanged route and the edge kept serving
// it as a HIT without revalidating — so newly-publishable waters never reached
// the sitemap even though their pages already flipped to index. `ssrQuery` runs
// the GraphQL schema in-process (no HTTP hop) and crawlers fetch this rarely, so
// rendering live per request is cheap.
export const dynamic = 'force-dynamic'

// Lists every water with its latest score, location, basin, and most-recent
// report date so the sitemap can gate near/compare/water entries consistently.
const SITEMAP_WATERS_QUERY = /* GraphQL */ `
  query SitemapWaters {
    waterBodies {
      slug
      latitude
      longitude
      basin {
        slug
      }
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
  latitude: number | null
  longitude: number | null
  basin: { slug: string } | null
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
    // /near and /compare are static, always-publishable hub pages (issue
    // #147) — they list only already-gated leaves, so unlike /water, /basin,
    // /near/[town], and /compare/[pair] below they need no isPublishable check.
    {
      url: `${SITE_URL}/near`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/compare`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.5,
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

  const basinEntries = buildBasinSitemapEntries(waters, now)
  const nearEntries = buildNearSitemapEntries(waters, now)
  const compareEntries = buildCompareSitemapEntries(waters, now)

  return [
    ...staticEntries,
    ...waterEntries,
    ...basinEntries,
    ...nearEntries,
    ...compareEntries,
  ]
}

function buildBasinSitemapEntries(
  waters: SitemapWater[],
  now: Date
): MetadataRoute.Sitemap {
  // Group the already-fetched waters by basin slug so we avoid a second
  // round-trip — a basin is publishable iff any of its member waters is.
  const byBasin = new Map<string, SitemapWater[]>()
  for (const w of waters) {
    const basinSlug = w.basin?.slug
    if (!basinSlug) continue
    const members = byBasin.get(basinSlug)
    if (members) {
      members.push(w)
    } else {
      byBasin.set(basinSlug, [w])
    }
  }

  return Array.from(byBasin.entries()).flatMap(([basinSlug, members]) => {
    const publishableMembers = members.filter((w) =>
      isPublishable({
        signal: w.currentSignal,
        latestReportDate: w.recentReports[0]?.reportDate ?? null,
      })
    )
    if (publishableMembers.length === 0) return []

    // lastmod = freshest date among the basin's publishable member waters.
    const dates = publishableMembers.flatMap((w) =>
      [w.currentSignal?.scoreDate, w.recentReports[0]?.reportDate].filter(
        (d): d is string => d != null
      )
    )
    const lastmod = dates.sort().at(-1)

    return [
      {
        url: `${SITE_URL}/basin/${basinSlug}`,
        lastModified: lastmod ? new Date(lastmod) : now,
        changeFrequency: 'daily' as const,
        priority: 0.6,
      },
    ]
  })
}

function buildNearSitemapEntries(
  waters: SitemapWater[],
  now: Date
): MetadataRoute.Sitemap {
  return TOWNS.flatMap((town) => {
    const nearby = waters.filter((w) => {
      if (w.latitude == null || w.longitude == null) return false
      return (
        haversineDistanceMiles(town.lat, town.lon, w.latitude, w.longitude) <=
        MAX_NEAR_DISTANCE_MILES
      )
    })

    const hasPublishable = nearby.some((w) =>
      isPublishable({
        signal: w.currentSignal,
        latestReportDate: w.recentReports[0]?.reportDate ?? null,
      })
    )
    if (!hasPublishable) return []

    // lastmod = freshest date among publishable nearby waters.
    const dates = nearby
      .filter((w) =>
        isPublishable({
          signal: w.currentSignal,
          latestReportDate: w.recentReports[0]?.reportDate ?? null,
        })
      )
      .flatMap((w) =>
        [w.currentSignal?.scoreDate, w.recentReports[0]?.reportDate].filter(
          (d): d is string => d != null
        )
      )
    const lastmod = dates.sort().at(-1)

    return [
      {
        url: `${SITE_URL}/near/${town.slug}`,
        lastModified: lastmod ? new Date(lastmod) : now,
        changeFrequency: 'daily' as const,
        priority: 0.6,
      },
    ]
  })
}

function buildCompareSitemapEntries(
  waters: SitemapWater[],
  now: Date
): MetadataRoute.Sitemap {
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
    .map(({ slugA, slugB }) => {
      const a = waters.find((w) => w.slug === slugA)!
      const b = waters.find((w) => w.slug === slugB)!
      const dates = [a, b].flatMap((w) =>
        [w.currentSignal?.scoreDate, w.recentReports[0]?.reportDate].filter(
          (d): d is string => d != null
        )
      )
      const lastmod = dates.sort().at(-1)
      return {
        url: `${SITE_URL}/compare/${slugA}-vs-${slugB}`,
        lastModified: lastmod ? new Date(lastmod) : now,
        changeFrequency: 'daily' as const,
        priority: 0.5,
      }
    })
}
