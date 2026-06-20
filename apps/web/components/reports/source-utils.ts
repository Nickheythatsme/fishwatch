// Shared helpers for rendering report source ("shop") attribution.
//
// `source_name` is a slug-ish key from the scraper (e.g. `confluence_fly_shop`);
// `formatSourceName` turns it into a human-readable label. Previously this logic
// was duplicated in ReportCard and ReportFilters — both now import from here.

/** Turn a slug-ish source key (`confluence_fly_shop`) into `Confluence Fly Shop`. */
export function formatSourceName(name: string): string {
  return name
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/**
 * Derive a shop *homepage* link from a report's deep `sourceUrl`.
 *
 * A `sourceUrl` points at a specific report page; for a "Reports sourced from"
 * credit we want the shop itself, so we collapse the URL to its origin
 * (scheme + host). Falls back to the raw URL if it can't be parsed, and to
 * `null` when no URL is available.
 */
export function shopHomepageFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url).origin
  } catch {
    return url
  }
}

/** A distinct source shop contributing reports to a water, ready to render. */
export interface SourceCredit {
  /** The raw `source_name` key — stable identity for React keys / dedup. */
  sourceName: string
  /** Human-readable shop label. */
  label: string
  /** Outbound credit link (shop homepage), or `null` when no URL is known. */
  url: string | null
}

interface CreditableReport {
  sourceName: string
  sourceUrl?: string | null
}

/**
 * Reduce a water's reports to the distinct set of source shops, preserving the
 * input order (reports arrive most-recent-first, so the freshest report's URL
 * wins for each shop). De-duplicates by `sourceName`.
 */
export function deriveSourceCredits(reports: readonly CreditableReport[]): SourceCredit[] {
  const seen = new Map<string, SourceCredit>()
  for (const report of reports) {
    const existing = seen.get(report.sourceName)
    if (existing) {
      // Backfill a URL if an earlier (more recent) report for this shop lacked one.
      if (existing.url == null) existing.url = shopHomepageFromUrl(report.sourceUrl)
      continue
    }
    seen.set(report.sourceName, {
      sourceName: report.sourceName,
      label: formatSourceName(report.sourceName),
      url: shopHomepageFromUrl(report.sourceUrl),
    })
  }
  return [...seen.values()]
}
