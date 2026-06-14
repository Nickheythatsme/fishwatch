'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

interface BackButtonProps {
  /**
   * Where to navigate when there is no in-app history to go back to (e.g. the
   * page was opened from a deep link or a fresh tab). Defaults to the homepage.
   */
  fallbackHref?: string
  label?: string
  className?: string
}

/**
 * A "back" affordance for detail pages. On mobile the global TopBar is hidden,
 * so detail pages have no top-of-page navigation — this fills that gap.
 *
 * Prefers the browser's back stack (returning the user to wherever they came
 * from — the homepage or the reports list) and falls back to a known route when
 * there is no history to pop.
 */
export function BackButton({
  fallbackHref = '/',
  label = 'Back',
  className,
}: BackButtonProps) {
  const router = useRouter()

  function handleClick() {
    // `history.length > 1` means there is an entry to pop back to within the
    // tab. Otherwise (direct/deep link) send the user to a sensible home base.
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push(fallbackHref)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      className={
        'inline-flex min-h-[44px] items-center gap-1 -ml-2 pr-3 pl-1 font-label text-sm font-semibold tracking-wide text-on-surface-variant transition-colors hover:text-primary-container' +
        (className ? ' ' + className : '')
      }
    >
      <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
      {label}
    </button>
  )
}
