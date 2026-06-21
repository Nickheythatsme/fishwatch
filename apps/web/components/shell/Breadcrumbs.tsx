import Link from 'next/link'

/**
 * A single breadcrumb trail item. `href` is omitted for the current page (the
 * last crumb), which renders as plain text marked `aria-current="page"`.
 */
export interface Crumb {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: Crumb[]
  className?: string
}

/**
 * Server-rendered breadcrumb trail: Home → … → current page.
 *
 * Accessible by construction: a labelled <nav> wrapping an ordered list, with
 * the final crumb marked `aria-current="page"`. The structured-data
 * (`BreadcrumbList` JSON-LD) counterpart is owned by #62 to avoid duplication.
 *
 * Future-proofing: this component takes an arbitrary ordered list of crumbs, so
 * a "Basin" level can be slotted between Home and the water without touching
 * this file — the caller just inserts an extra `Crumb`. The basin crumb itself
 * is wired up in Epic 4 (#67), once basins/basin hubs exist.
 */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (items.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 font-label text-xs text-on-surface-variant">
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="rounded transition-colors hover:text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={isLast ? 'font-semibold text-on-surface' : undefined}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                <span aria-hidden className="text-outline-variant">
                  /
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
