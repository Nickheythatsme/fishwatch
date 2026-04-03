import { GraphQLContext } from '../context'

export const waterBodyResolvers = {
  Query: {
    waterBodies: async (_: unknown, args: { region?: string }, ctx: GraphQLContext) => {
      let query = ctx.supabase
        .from('water_bodies')
        .select('*')
        .order('name')

      if (args.region) {
        query = query.eq('region', args.region)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },

    waterBody: async (_: unknown, args: { id?: string; slug?: string }, ctx: GraphQLContext) => {
      if (!args.id && !args.slug) throw new Error('Provide either id or slug')

      let query = ctx.supabase.from('water_bodies').select('*')
      if (args.id) query = query.eq('id', args.id)
      if (args.slug) query = query.eq('slug', args.slug)

      const { data, error } = await query.single()
      if (error) throw error
      return data
    },

    topPicks: async (_: unknown, args: { limit: number }, ctx: GraphQLContext) => {
      const today = new Date().toISOString().split('T')[0]
      const { data: scores, error } = await ctx.supabase
        .from('water_scores')
        .select('water_body_id')
        .eq('score_date', today)
        .order('composite_score', { ascending: false })
        .limit(args.limit)

      if (error) throw error
      if (!scores?.length) return []

      const ids = scores.map(s => s.water_body_id)
      const { data } = await ctx.supabase
        .from('water_bodies')
        .select('*')
        .in('id', ids)

      return data ?? []
    },
  },

  WaterBody: {
    currentSignal: async (parent: { id: string }, _: unknown, ctx: GraphQLContext) => {
      const { data } = await ctx.supabase
        .from('water_scores')
        .select('*')
        .eq('water_body_id', parent.id)
        .order('score_date', { ascending: false })
        .limit(1)
        .single()

      return data
    },

    signals: async (parent: { id: string }, args: { days: number }, ctx: GraphQLContext) => {
      const since = new Date()
      since.setDate(since.getDate() - args.days)

      const { data } = await ctx.supabase
        .from('water_scores')
        .select('*')
        .eq('water_body_id', parent.id)
        .gte('score_date', since.toISOString().split('T')[0])
        .order('score_date', { ascending: true })

      return data ?? []
    },

    recentReports: async (parent: { id: string }, args: { limit: number }, ctx: GraphQLContext) => {
      const { data } = await ctx.supabase
        .from('parsed_reports')
        .select('*')
        .eq('water_body_id', parent.id)
        .order('report_date', { ascending: false })
        .limit(args.limit)

      return data ?? []
    },

    gaugeReadings: async (parent: { id: string }, args: { hours: number }, ctx: GraphQLContext) => {
      const since = new Date()
      since.setHours(since.getHours() - args.hours)

      const { data } = await ctx.supabase
        .from('gauge_readings')
        .select('*')
        .eq('water_body_id', parent.id)
        .gte('measured_at', since.toISOString())
        .order('measured_at', { ascending: false })

      return data ?? []
    },

    currentFlow: async (parent: { id: string }, _: unknown, ctx: GraphQLContext) => {
      const { data } = await ctx.supabase
        .from('gauge_readings')
        .select('flow_cfs')
        .eq('water_body_id', parent.id)
        .order('measured_at', { ascending: false })
        .limit(1)
        .single()

      return data?.flow_cfs ?? null
    },

    typicalSpecies: (parent: { typical_species?: string[] }) => parent.typical_species ?? [],
  },
}
