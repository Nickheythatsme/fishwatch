'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { useCanGoBack } from '@/components/shell/NavigationHistoryProvider'

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
 * When the user reached this page via an in-app navigation we pop the history
 * stack (returning them to wherever they came from — the homepage or the
 * reports list). When they arrived fresh (a deep link or shared URL) there is
 * no in-app entry to pop, so we navigate to a known route instead of risking
 * `router.back()` sending them out of the app.
 */
export function BackButton({
  fallbackHref = '/',
  label = 'Back',
  className,
}: BackButtonProps) {
  const router = useRouter()
  const canGoBack = useCanGoBack()

  function handleClick() {
    if (canGoBack) {
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
