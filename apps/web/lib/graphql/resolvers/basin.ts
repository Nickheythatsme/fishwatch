import { GraphQLContext } from '../context'

type BasinRow = {
  id: string
  name: string
  slug: string
  region: string
  description: string | null
  created_at: string
}

type WaterBodyParent = {
  basin_id: string | null
  [key: string]: unknown
}

export const basinResolvers = {
  Query: {
    basins: async (_: unknown, args: { region?: string }, ctx: GraphQLContext) => {
      let query = ctx.supabase.from('basins').select('*').order('name')
      if (args.region) {
        query = query.eq('region', args.region)
      }
      const { data, error } = await query
      if (error) throw error
      return data
    },

    basin: async (_: unknown, args: { slug: string }, ctx: GraphQLContext) => {
      const { data, error } = await ctx.supabase
        .from('basins')
        .select('*')
        .eq('slug', args.slug)
        .single()
      if (error) throw error
      return data
    },
  },

  Basin: {
    waters: async (parent: BasinRow, _: unknown, ctx: GraphQLContext) => {
      const { data, error } = await ctx.supabase
        .from('water_bodies')
        .select('*')
        .eq('basin_id', parent.id)
        .order('name')
      if (error) throw error
      return data ?? []
    },
  },

  WaterBody: {
    basin: async (parent: WaterBodyParent, _: unknown, ctx: GraphQLContext) => {
      if (!parent.basin_id) return null
      const { data, error } = await ctx.supabase
        .from('basins')
        .select('*')
        .eq('id', parent.basin_id)
        .single()
      if (error) throw error
      return data
    },
  },
}
