import { GraphQLContext } from '../context'

export const reportResolvers = {
  Query: {
    reports: async (
      _: unknown,
      args: { waterBodyId?: string; sourceName?: string; limit: number; offset: number },
      ctx: GraphQLContext
    ) => {
      let query = ctx.supabase
        .from('parsed_reports')
        .select('*')
        .order('report_date', { ascending: false })
        .range(args.offset, args.offset + args.limit - 1)

      if (args.waterBodyId) {
        query = query.eq('water_body_id', args.waterBodyId)
      }
      if (args.sourceName) {
        query = query.eq('source_name', args.sourceName)
      }

      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
  },

  Report: {
    sourceName: (parent: Record<string, unknown>) => parent.source_name,
    reportDate: (parent: Record<string, unknown>) => parent.report_date,
    speciesMentioned: (parent: Record<string, unknown>) =>
      (parent.species_mentioned as string[]) ?? [],
    flyPatternsMentioned: (parent: Record<string, unknown>) =>
      (parent.fly_patterns_mentioned as string[]) ?? [],
    conditionsSummary: (parent: Record<string, unknown>) => parent.conditions_summary,
    flowCommentary: (parent: Record<string, unknown>) => parent.flow_commentary,
    waterClarity: (parent: Record<string, unknown>) => parent.water_clarity,
    waterBody: async (parent: Record<string, unknown>, _: unknown, ctx: GraphQLContext) => {
      if (!parent.water_body_id) return null
      const { data } = await ctx.supabase
        .from('water_bodies')
        .select('*')
        .eq('id', parent.water_body_id)
        .single()
      return data
    },
  },
}
