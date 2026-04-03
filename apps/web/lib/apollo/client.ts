import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client'

function makeClient() {
  const httpLink = new HttpLink({
    uri: '/api/graphql',
  })

  return new ApolloClient({
    cache: new InMemoryCache(),
    link: httpLink,
    ssrMode: typeof window === 'undefined',
  })
}

let client: ApolloClient<unknown> | undefined

export function getClient() {
  if (typeof window === 'undefined') {
    return makeClient()
  }
  if (!client) {
    client = makeClient()
  }
  return client
}
