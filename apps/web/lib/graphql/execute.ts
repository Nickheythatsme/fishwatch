import 'server-only'
import { cache } from 'react'
import { graphql } from 'graphql'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { typeDefs } from '@/lib/graphql/schema'
import { resolvers } from '@/lib/graphql/resolvers'
import { createContext } from '@/lib/graphql/context'

// Build the executable schema once at module load from the exact typeDefs +
// resolvers the HTTP route uses, so Server Components and `/api/graphql` stay a
// single source of truth. `makeExecutableSchema` is what graphql-yoga's
// `createSchema` wraps; using it directly keeps the schema and the `graphql()`
// executor on the same `graphql` instance.
const schema = makeExecutableSchema({ typeDefs, resolvers })

/**
 * Run a GraphQL query in-process from a Server Component — no HTTP round-trip.
 *
 * Wrapped in React's `cache()` so identical (source, variables) pairs are
 * deduped within a single render pass.
 *
 * NOTE: executing through `graphql()` directly bypasses the graphql-yoga
 * security plugins applied in `app/api/graphql/route.ts` (depth limiting,
 * introspection toggle, CORS). That is intentional and safe here: these queries
 * originate from server-trusted code, not arbitrary clients. If depth limiting
 * is ever wanted for SSR too, run `validate()` with `maxDepthRule` before
 * executing.
 */
export const ssrQuery = cache(async function ssrQuery<T>(
  source: string,
  variableValues?: Record<string, unknown>
): Promise<T> {
  const result = await graphql({
    schema,
    source,
    variableValues,
    contextValue: createContext(),
  })

  if (result.errors?.length) {
    throw new Error(result.errors.map(e => e.message).join('; '))
  }

  return result.data as T
})
