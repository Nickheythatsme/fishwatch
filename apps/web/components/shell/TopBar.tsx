'use client'

import { Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserCircle } from 'lucide-react'
import { ReportFilters } from '@/components/reports/ReportFilters'

const TABS = [
  { href: '/', label: 'Intelligence' },
  { href: '/reports', label: 'Reports' },
] as const

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

export function TopBar() {
  const pathname = usePathname()
  return (
    <header className="sticky top-0 z-50 hidden w-full bg-surface md:block">
      <div className="mx-auto flex max-w-[1920px] items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center gap-2 font-headline text-2xl italic text-primary-container"
          >
            <Image
              src="/favicon-96x96.png"
              alt=""
              width={36}
              height={36}
              priority
              className="h-9 w-9"
            />
            Score.Fish
          </Link>
          <nav className="flex items-center gap-6">
            {TABS.map((tab) => {
              const active = isActive(pathname, tab.href)
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? 'page' : undefined}
                  className={
                    active
                      ? 'border-b-2 border-primary-container pb-0.5 font-label text-sm font-bold tracking-wide text-primary-container'
                      : 'font-label text-sm tracking-wide text-on-surface-variant transition-colors hover:text-primary-container'
                  }
                >
                  {tab.label}
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Suspense
            fallback={
              <div className="flex items-center gap-2 rounded-md bg-surface-container-low px-4 py-2">
                <span className="font-label text-xs font-semibold text-on-surface-variant">
                  FILTER REPORTS
                </span>
              </div>
            }
          >
            <ReportFilters />
          </Suspense>
          <button
            type="button"
            aria-label="Account"
            className="rounded-full p-2 transition-colors hover:bg-surface-container-low"
          >
            <UserCircle className="h-6 w-6 text-primary-container" />
          </button>
        </div>
      </div>
    </header>
  )
}
