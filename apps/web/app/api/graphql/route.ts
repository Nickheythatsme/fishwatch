import { createYoga, createSchema } from 'graphql-yoga'
import { typeDefs } from '@/lib/graphql/schema'
import { resolvers } from '@/lib/graphql/resolvers'
import { createContext } from '@/lib/graphql/context'

const { handleRequest } = createYoga({
  schema: createSchema({ typeDefs, resolvers }),
  graphqlEndpoint: '/api/graphql',
  fetchAPI: { Response },
  context: createContext,
})

export { handleRequest as GET, handleRequest as POST }
