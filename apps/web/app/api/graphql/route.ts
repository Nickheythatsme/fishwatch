import { createYoga, createSchema, type Plugin } from 'graphql-yoga'
import type { NextRequest } from 'next/server'
import { NoSchemaIntrospectionCustomRule } from 'graphql'
import { typeDefs } from '@/lib/graphql/schema'
import { resolvers } from '@/lib/graphql/resolvers'
import { createContext } from '@/lib/graphql/context'
import { maxDepthRule } from '@/lib/graphql/depthLimit'

const isProd = process.env.NODE_ENV === 'production'

// Bound query nesting (always) and disable introspection in production.
const validationRules = [
  maxDepthRule(12),
  ...(isProd ? [NoSchemaIntrospectionCustomRule] : []),
]

const securityPlugin: Plugin = {
  onValidate({ addValidationRule }) {
    for (const rule of validationRules) addValidationRule(rule)
  },
}

const { handleRequest } = createYoga({
  schema: createSchema({ typeDefs, resolvers }),
  graphqlEndpoint: '/api/graphql',
  fetchAPI: { Response },
  context: createContext,
  // Disable the GraphiQL playground in production.
  graphiql: !isProd,
  // Restrict cross-origin browser access to the app's own domains in production.
  cors: {
    origin: isProd ? ['https://score.fish', 'https://www.score.fish'] : '*',
    methods: ['GET', 'POST', 'OPTIONS'],
  },
  plugins: [securityPlugin],
})

// graphql-yoga's handler signature doesn't satisfy Next 16's stricter
// route-handler type checking, so wrap it in handlers with the expected shape.
// createContext() ignores the server context, so nothing is lost by not
// forwarding Next's route context.
function handler(request: NextRequest) {
  return handleRequest(request, {})
}

export { handler as GET, handler as POST }
