import Link from 'next/link'
import { MapPin } from 'lucide-react'
import type { Town } from '@/lib/near/towns'

interface NearbyTownsProps {
  /** Already gated via `isTownPublishable` — never a noindex `/near/[town]` page. */
  towns: Town[]
}

/**
 * Server-rendered "Fishing Near" block: contextual links to publishable
 * `/near/[town]` hub pages (issue #147). Every town passed in is already
 * filtered by the caller — this component is purely presentational.
 */
export function NearbyTowns({ towns }: NearbyTownsProps) {
  if (towns.length === 0) return null

  return (
    <section aria-labelledby="nearby-towns-heading">
      <h2 id="nearby-towns-heading" className="mb-4 font-headline text-lg font-bold text-on-surface">
        Fishing Near
      </h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {towns.map((town) => (
          <li key={town.slug}>
            <Link
              href={`/near/${town.slug}`}
              className="flex items-center gap-2 rounded-xl bg-surface-container-low px-4 py-3 font-body text-sm text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
            >
              <MapPin className="h-4 w-4 shrink-0 text-secondary" aria-hidden />
              {town.name}, {town.state}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
