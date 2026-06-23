import type { Metadata } from 'next'

/**
 * Production origin. Single source of truth for canonical + Open Graph URLs and
 * the root layout's `metadataBase` (which resolves relative OG image paths).
 */
export const SITE_URL = 'https://score.fish'

// The fields the builder needs, kept minimal so the water page's richer
// `WaterBody` type satisfies it structurally without an explicit cast.
interface WaterMetadataInput {
  name: string
  slug: string
  description: string | null
  currentFlow: number | null
  currentSignal: {
    compositeScore: number
    summary: string | null
  } | null
}

const DESCRIPTION_MAX = 155

// Truncate at a word boundary, appending an ellipsis when the text is cut.
function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  const slice = text.slice(0, max - 1)
  const lastSpace = slice.lastIndexOf(' ')
  return `${slice.slice(0, lastSpace > 0 ? lastSpace : slice.length).trimEnd()}…`
}

// "June 2026" — recomputed on each ISR pass so the title reads as current. Uses
// the PNW timezone the app is centered on so the month flips at local midnight.
function currentMonthYear(): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Los_Angeles',
  }).format(new Date())
}

/**
 * Build `/leaderboard` page metadata: title, description, canonical, and OG /
 * Twitter tags. The month/year in the title is recomputed on each ISR pass so
 * the heading reads as current without a rebuild.
 */
export function buildLeaderboardMetadata(): Metadata {
  // Title, description, and the underlying query are all Pacific Northwest-wide
  // (the leaderboard ranks every water body, not just Central Oregon) so the
  // geography reads consistently in search results and matches the product's
  // PNW branding.
  const title = `Pacific Northwest Fishing Report — Today's Top Waters (${currentMonthYear()})`
  const description =
    'Ranked fishing conditions across Pacific Northwest waters, updated every 30 minutes from fly shop reports and USGS gauge data.'
  const canonical = `${SITE_URL}/leaderboard`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'Score.Fish',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: { index: true, follow: true },
  }
}

/**
 * Build per-water page metadata: a unique title, description, canonical, and
 * Open Graph / Twitter tags. Shared by `generateMetadata` so the markup isn't
 * duplicated inline.
 */
export function buildWaterMetadata(water: WaterMetadataInput): Metadata {
  const title = `${water.name} Fishing Report & Conditions — ${currentMonthYear()}`

  // Synthesize the description from the live signal summary (preferred) or the
  // static blurb, then append the current flow when we have it.
  const parts: string[] = []
  const lead = water.currentSignal?.summary ?? water.description
  if (lead) parts.push(lead.trim())
  if (water.currentFlow != null) {
    parts.push(`Current flow ${Math.round(water.currentFlow).toLocaleString('en-US')} cfs.`)
  }
  const description = truncate(
    parts.join(' ') ||
      `Latest fishing report, river flow, and conditions for ${water.name}.`,
    DESCRIPTION_MAX
  )

  const canonical = `${SITE_URL}/water/${water.slug}`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'Score.Fish',
      type: 'website',
      // The OG image is added by the dynamic-OG-image issue (#64); once present
      // it resolves against the root layout's `metadataBase`.
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    // Default; overridden by generateMetadata via isPublishable() (issue #68).
    robots: { index: true, follow: true },
  }
}
