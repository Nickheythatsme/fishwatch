import { createServerClient } from '@supabase/ssr'

export function createContext() {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return []
        },
        setAll() {
          // GraphQL route doesn't need cookie management
        },
      },
    }
  )
  // Per-request caches keyed by water_body_id. Avoids re-querying parsed_reports
  // once per Signal in a dashboard payload with many water bodies.
  const topSectionCache = new Map<string, Promise<string | null>>()
  return { supabase, topSectionCache }
}

export type GraphQLContext = ReturnType<typeof createContext>
