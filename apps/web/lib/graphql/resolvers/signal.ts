import { GraphQLContext } from '../context'

type SignalParent = Record<string, unknown> & { water_body_id?: string }

async function fetchTopSection(
  waterBodyId: string,
  ctx: GraphQLContext
): Promise<string | null> {
  const cached = ctx.topSectionCache.get(waterBodyId)
  if (cached) return cached

  const promise = (async () => {
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
    const { data } = await ctx.supabase
      .from('parsed_reports')
      .select('river_section')
      .eq('water_body_id', waterBodyId)
      .gte('report_date', since)
      .not('river_section', 'is', null)

    if (!data || data.length === 0) return null
    const counts = new Map<string, number>()
    ;(data as { river_section: string | null }[]).forEach((row) => {
      const s = row.river_section
      if (!s) return
      counts.set(s, (counts.get(s) ?? 0) + 1)
    })
    let best: string | null = null
    let bestCount = 0
    counts.forEach((count, section) => {
      if (count > bestCount) {
        best = section
        bestCount = count
      }
    })
    return best
  })()

  ctx.topSectionCache.set(waterBodyId, promise)
  return promise
}

export const signalResolvers = {
  Signal: {
    compositeScore: (parent: SignalParent) => parent.composite_score,
    scoreDate: (parent: SignalParent) => parent.score_date,
    flowScore: (parent: SignalParent) => parent.flow_score,
    sentimentScore: (parent: SignalParent) => parent.sentiment_score,
    consensusScore: (parent: SignalParent) => parent.consensus_score,
    recommendedSpecies: (parent: SignalParent) =>
      (parent.recommended_species as string[]) ?? [],
    recommendedFlies: (parent: SignalParent) =>
      (parent.recommended_flies as string[]) ?? [],
    topSection: async (parent: SignalParent, _: unknown, ctx: GraphQLContext) => {
      if (!parent.water_body_id) return null
      return fetchTopSection(parent.water_body_id, ctx)
    },
  },
}
