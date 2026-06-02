'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Compass, Map as MapIcon, Newspaper, type LucideIcon } from 'lucide-react'

const ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/', label: 'Intel', icon: Compass },
  // The Map tab points at the homepage anchor — Phase 3 wires this to open
  // the bottom-sheet drawer.
  { href: '/#map', label: 'Map', icon: MapIcon },
  { href: '/reports', label: 'Reports', icon: Newspaper },
]

function isActive(pathname: string, href: string): boolean {
  const path = href.split('#')[0] || '/'
  if (path === '/') return pathname === '/'
  return pathname === path || pathname.startsWith(path + '/')
}

export function MobileNav() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-around bg-surface-container-low py-2 md:hidden"
    >
      {ITEMS.map((item) => {
        const Icon = item.icon
        const active = isActive(pathname, item.href)
        return (
          <Link
            key={item.label}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={
              'flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 ' +
              (active ? 'text-primary-container' : 'text-on-surface-variant')
            }
          >
            <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 2} />
            <span className="font-label text-[10px] uppercase tracking-wider">
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
