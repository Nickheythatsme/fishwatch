'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

/**
 * True when the user has performed at least one in-app (client-side) navigation
 * during this page-load session — i.e. there is a known in-app entry to return
 * to with `router.back()`.
 *
 * We can't infer this from `window.history.length`: that counts every entry in
 * the tab's session history, including cross-origin pages, so a user arriving
 * from an external link (a shared URL, a messaging app) would have
 * `history.length >= 2` even though pressing "back" would leave the app
 * entirely. Tracking soft navigations ourselves is the only reliable signal.
 */
const CanGoBackContext = createContext(false)

export function NavigationHistoryProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [canGoBack, setCanGoBack] = useState(false)
  // The provider mounts once per full page load and persists across client-side
  // navigations, so the first pathname effect is the initial render, not a
  // navigation — skip it.
  const isInitialRender = useRef(true)

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false
      return
    }
    setCanGoBack(true)
  }, [pathname])

  return <CanGoBackContext.Provider value={canGoBack}>{children}</CanGoBackContext.Provider>
}

/**
 * Whether `router.back()` will return the user to another page within the app
 * (rather than navigating out to wherever they came from).
 */
export function useCanGoBack(): boolean {
  return useContext(CanGoBackContext)
}
