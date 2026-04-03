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
  return { supabase }
}

export type GraphQLContext = ReturnType<typeof createContext>
