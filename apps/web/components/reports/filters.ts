export interface ReportFilters {
  sources: string[]
  species: string[]
}

const SOURCE_PARAM = 'source'
const SPECIES_PARAM = 'species'

function splitList(value: string | null): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
}

export function parseReportFilters(params: URLSearchParams): ReportFilters {
  return {
    sources: splitList(params.get(SOURCE_PARAM)),
    species: splitList(params.get(SPECIES_PARAM)),
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
