import type { Metadata } from 'next'
import type { Town } from '@/lib/near/towns'

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

// Normalize a raw lead fragment into a clean sentence: trim, capitalize the
// first alphabetic character, and ensure it ends with sentence-ending
// punctuation (append '.' when it doesn't). e.g. "flow at 1250 cfs" -> "Flow at 1250 cfs."
function normalizeLead(lead: string): string {
  const trimmed = lead.trim()
  const capitalized = trimmed.replace(/[a-z]/i, (c) => c.toUpperCase())
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`
}

// Detect whether a string already references flow, so we don't append a
// redundant "Current flow X cfs." sentence. Matches the word "flow" or a "cfs"
// token, case-insensitively.
function mentionsFlow(text: string): boolean {
  return /\bflow\b/i.test(text) || /\bcfs\b/i.test(text)
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
 * Build `/reports` feed metadata: title, description, canonical, and OG /
 * Twitter tags. Without these the page inherited the generic root-layout title
 * and had no description, so Google built snippets by scraping visible DOM text
 * (nav + filter chrome interleaved with cards). The month/year in the title is
 * recomputed on each ISR pass so the heading reads as current without a rebuild.
 */
export function buildReportsMetadata(): Metadata {
  // Feed aggregates reports across every water body, so keep the framing
  // Pacific Northwest-wide to match the product's branding and the other
  // PNW-wide pages (leaderboard).
  const title = `Latest Pacific Northwest Fishing Reports — ${currentMonthYear()}`
  const description =
    'Fresh fly shop fishing reports for Pacific Northwest rivers and lakes — conditions, hatches, and hot flies, aggregated and updated every 30 minutes.'
  const canonical = `${SITE_URL}/reports`

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

// The fields needed for basin page metadata.
interface BasinMetadataInput {
  name: string
  slug: string
  description: string | null
}

/**
 * Build /basin/[slug] hub page metadata: title, description, canonical, and
 * OG / Twitter tags. Mirrors `buildLeaderboardMetadata` in structure.
 */
export function buildBasinMetadata(basin: BasinMetadataInput): Metadata {
  const title = `${basin.name} Fishing Report & Conditions — ${currentMonthYear()}`
  const description = truncate(
    basin.description?.trim() ||
      `Fishing conditions, top waters, and reports for the ${basin.name} in the Pacific Northwest.`,
    DESCRIPTION_MAX
  )
  const canonical = `${SITE_URL}/basin/${basin.slug}`

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
 * Build /near/[town] page metadata.
 */
export function buildNearMetadata(town: Town): Metadata {
  const title = `Fishing Near ${town.name}, ${town.state} — Top Waters (${currentMonthYear()})`
  const description = `Live fishing conditions for rivers and streams within 200 miles of ${town.name}, ${town.state}. Ranked by distance and today's composite score.`
  const canonical = `${SITE_URL}/near/${town.slug}`
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
    twitter: { card: 'summary_large_image', title, description },
    robots: { index: true, follow: true },
  }
}

interface CompareMetadataInput {
  nameA: string
  nameB: string
  slugA: string
  slugB: string
  winnerName?: string | null
}

/**
 * Build /compare/[pair] page metadata.
 */
export function buildCompareMetadata(input: CompareMetadataInput): Metadata {
  const { nameA, nameB, slugA, slugB, winnerName } = input
  const title = `${nameA} vs. ${nameB} — Fishing Conditions Today (${currentMonthYear()})`
  const description = winnerName
    ? `${winnerName} is fishing better right now. Compare live conditions, flows, and scores for ${nameA} and ${nameB}, updated every 30 minutes.`
    : `Side-by-side fishing conditions for ${nameA} and ${nameB}, updated every 30 minutes from fly shop reports and USGS gauge data.`
  const canonical = `${SITE_URL}/compare/${slugA}-vs-${slugB}`
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
    twitter: { card: 'summary_large_image', title, description },
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
  const rawLead = water.currentSignal?.summary ?? water.description
  const lead = rawLead ? normalizeLead(rawLead) : null
  if (lead) parts.push(lead)
  // Only append a flow sentence when the lead doesn't already mention flow, so
  // we don't emit a redundant (and sometimes conflicting) second figure.
  if (water.currentFlow != null && !(lead && mentionsFlow(lead))) {
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
