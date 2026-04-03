import { createClient } from '@supabase/supabase-js'

export function createContext() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  return { supabase }
}

export type GraphQLContext = ReturnType<typeof createContext>
