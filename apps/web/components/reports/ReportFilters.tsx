'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { gql, useQuery } from '@apollo/client'
import { ChevronDown, Filter } from 'lucide-react'
import {
  activeFilterCount,
  parseReportFilters,
  serializeReportFilters,
  type ReportFilters,
} from './filters'
import { formatSourceName } from '@/components/reports/source-utils'

const REPORTS_PATH = '/reports'

const FILTER_OPTIONS_QUERY = gql`
  query ReportFilterOptions($limit: Int) {
    reports(limit: $limit) {
      id
      sourceName
      speciesMentioned
    }
  }
`

interface OptionsResponse {
  reports: { id: string; sourceName: string; speciesMentioned: string[] }[]
}

interface FilterOption {
  value: string
  label: string
}

function formatSpecies(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function chipClasses(active: boolean): string {
  return (
    'rounded-md px-2.5 py-1 font-label text-xs font-semibold transition-colors ' +
    (active
      ? 'bg-primary-container text-on-primary'
      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high')
  )
}

export function ReportFilters() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const onReportsPage = pathname === REPORTS_PATH

  const [open, setOpen] = useState(false)

  // Close the dropdown whenever we navigate away from the reports page.
  useEffect(() => {
    if (!onReportsPage) setOpen(false)
  }, [onReportsPage])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const filters = useMemo(
    () => parseReportFilters(new URLSearchParams(searchParams.toString())),
    [searchParams]
  )
  const count = activeFilterCount(filters)

  // Only fetch option lists once the dropdown has been opened. The limit matches
  // the reports page so every offered option corresponds to a displayable report.
  const { data, loading } = useQuery<OptionsResponse>(FILTER_OPTIONS_QUERY, {
    variables: { limit: 100 },
    skip: !open,
  })

  const { sourceOptions, speciesOptions } = useMemo(() => {
    const sources = new Set<string>()
    const species = new Set<string>() // canonical (lowercase)
    for (const r of data?.reports ?? []) {
      if (r.sourceName) sources.add(r.sourceName)
      for (const s of r.speciesMentioned ?? []) {
        if (s) species.add(s.toLowerCase())
      }
    }
    const toSorted = (set: Set<string>, label: (v: string) => string): FilterOption[] =>
      Array.from(set)
        .sort((a, b) => a.localeCompare(b))
        .map((value) => ({ value, label: label(value) }))
    return {
      sourceOptions: toSorted(sources, formatSourceName),
      speciesOptions: toSorted(species, formatSpecies),
    }
  }, [data])

  function applyFilters(next: ReportFilters) {
    const qs = serializeReportFilters(new URLSearchParams(searchParams.toString()), next)
    router.replace(qs ? `${REPORTS_PATH}?${qs}` : REPORTS_PATH, { scroll: false })
  }

  function toggle(dimension: keyof ReportFilters, value: string) {
    const list = filters[dimension]
    const next = list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value]
    applyFilters({ ...filters, [dimension]: next })
  }

  function handleButtonClick() {
    if (!onReportsPage) {
      router.push(REPORTS_PATH)
      return
    }
    setOpen((o) => !o)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleButtonClick}
        aria-haspopup={onReportsPage ? 'menu' : undefined}
        aria-expanded={onReportsPage ? open : undefined}
        className="group flex items-center gap-2 rounded-md bg-surface-container-low px-4 py-2 transition-colors hover:bg-surface-container"
      >
        <Filter className="h-4 w-4 text-outline group-hover:text-primary-container" />
        <span className="font-label text-xs font-semibold text-on-surface-variant">
          FILTER REPORTS
        </span>
        {count > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-container px-1 font-label text-[10px] font-bold text-on-primary">
            {count}
          </span>
        )}
        {onReportsPage && (
          <ChevronDown
            className={
              'h-4 w-4 text-outline transition-transform ' + (open ? 'rotate-180' : '')
            }
          />
        )}
      </button>

      {onReportsPage && open && (
        <>
          {/* Click-outside backdrop */}
          <div
            className="fixed inset-0 z-40"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 z-50 mt-2 w-72 rounded-xl bg-surface-container-low p-4 shadow-lg ring-1 ring-outline-variant"
          >
            <div className="flex items-center justify-between">
              <p className="font-label text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Filter Reports
              </p>
              {count > 0 && (
                <button
                  type="button"
                  onClick={() => applyFilters({ sources: [], species: [] })}
                  className="font-label text-xs font-semibold text-primary hover:underline"
                >
                  Clear
                </button>
              )}
            </div>

            <FilterSection
              title="Source"
              options={sourceOptions}
              selected={filters.sources}
              loading={loading}
              onToggle={(v) => toggle('sources', v)}
            />
            <FilterSection
              title="Species"
              options={speciesOptions}
              selected={filters.species}
              loading={loading}
              onToggle={(v) => toggle('species', v)}
            />
          </div>
        </>
      )}
    </div>
  )
}

interface FilterSectionProps {
  title: string
  options: FilterOption[]
  selected: string[]
  loading: boolean
  onToggle: (value: string) => void
}

function FilterSection({ title, options, selected, loading, onToggle }: FilterSectionProps) {
  return (
    <div className="mt-4">
      <p className="mb-2 font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
        {title}
      </p>
      {loading && options.length === 0 ? (
        <p className="font-body text-xs text-outline">Loading…</p>
      ) : options.length === 0 ? (
        <p className="font-body text-xs text-outline">No options available.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {options.map((opt) => {
            const active = selected.includes(opt.value)
            return (
              <button
                key={opt.value}
                type="button"
                role="menuitemcheckbox"
                aria-checked={active}
                onClick={() => onToggle(opt.value)}
                className={chipClasses(active)}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
