export interface ReportFilters {
  sources: string[]
  species: string[]
}

const SOURCE_PARAM = 'source'
const SPECIES_PARAM = 'species'

function splitList(value: string | null, lowercase = false): string[] {
  if (!value) return []
  const items = value
    .split(',')
    .map((v) => (lowercase ? v.trim().toLowerCase() : v.trim()))
    .filter(Boolean)
  return Array.from(new Set(items))
}

export function parseReportFilters(params: URLSearchParams): ReportFilters {
  return {
    sources: splitList(params.get(SOURCE_PARAM)),
    // Species are canonicalized to lowercase so UI selection state and the
    // case-insensitive matching in matchesReportFilters stay in sync.
    species: splitList(params.get(SPECIES_PARAM), true),
  }
}

/**
 * Returns a query string (without the leading `?`) representing `filters`, applied on top of
 * `current`. Empty dimensions delete their param so the default state has a clean URL.
 */
export function serializeReportFilters(
  current: URLSearchParams,
  filters: ReportFilters
): string {
  const params = new URLSearchParams(current.toString())

  if (filters.sources.length > 0) {
    params.set(SOURCE_PARAM, filters.sources.join(','))
  } else {
    params.delete(SOURCE_PARAM)
  }

  if (filters.species.length > 0) {
    params.set(SPECIES_PARAM, filters.species.join(','))
  } else {
    params.delete(SPECIES_PARAM)
  }

  return params.toString()
}

export function matchesReportFilters(
  report: { sourceName: string; speciesMentioned: string[] },
  filters: ReportFilters
): boolean {
  if (filters.sources.length > 0 && !filters.sources.includes(report.sourceName)) {
    return false
  }

  if (filters.species.length > 0) {
    const wanted = new Set(filters.species.map((s) => s.toLowerCase()))
    const hasMatch = report.speciesMentioned.some((s) => wanted.has(s.toLowerCase()))
    if (!hasMatch) return false
  }

  return true
}

export function activeFilterCount(filters: ReportFilters): number {
  return filters.sources.length + filters.species.length
}
