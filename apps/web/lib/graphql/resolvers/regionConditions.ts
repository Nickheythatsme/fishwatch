import { GraphQLContext } from '../context'

function titleCase(s: string): string {
  return s
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

function classifyTrend(prior: number | null, recent: number | null): string | null {
  if (prior == null || recent == null || prior === 0) return null
  const delta = (recent - prior) / prior
  if (delta > 0.05) return 'Rising'
  if (delta < -0.05) return 'Falling'
  return 'Stable'
}

function classifyHatchVolume(count: number): string {
  if (count >= 5) return 'Heavy'
  if (count >= 2) return 'Moderate'
  return 'Light'
}

export const regionConditionsResolvers = {
  Query: {
    regionConditions: async (
      _: unknown,
      args: { region: string },
      ctx: GraphQLContext
    ) => {
      const { data: bodies, error: bodiesError } = await ctx.supabase
        .from('water_bodies')
        .select('id')
        .eq('region', args.region)

      if (bodiesError) throw bodiesError
      const ids = (bodies ?? []).map((b: { id: string }) => b.id)
      const locationLabel = titleCase(args.region)

      if (ids.length === 0) {
        return { flowTrend: null, hatchVolume: 'Light', waterTempF: null, locationLabel }
      }

      const now = Date.now()
      const since48h = new Date(now - 48 * 60 * 60 * 1000).toISOString()
      const cutoff24hMs = now - 24 * 60 * 60 * 1000
      const since7dDate = new Date(now - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10)

      const [gauges, reports] = await Promise.all([
        ctx.supabase
          .from('gauge_readings')
          .select('measured_at, flow_cfs, water_temp_f')
          .in('water_body_id', ids)
          .gte('measured_at', since48h),
        ctx.supabase
          .from('parsed_reports')
          .select('hatches')
          .in('water_body_id', ids)
          .gte('report_date', since7dDate),
      ])
      if (gauges.error) throw gauges.error
      if (reports.error) throw reports.error

      // Flow trend — split into prior 24h vs last 24h, then compare averages.
      let priorSum = 0,
        priorN = 0,
        recentSum = 0,
        recentN = 0
      let latestTemp: { ts: number; v: number } | null = null

      for (const row of (gauges.data ?? []) as {
        measured_at: string
        flow_cfs: number | null
        water_temp_f: number | null
      }[]) {
        const ts = new Date(row.measured_at).getTime()
        if (row.flow_cfs != null) {
          if (ts >= cutoff24hMs) {
            recentSum += row.flow_cfs
            recentN += 1
          } else {
            priorSum += row.flow_cfs
            priorN += 1
          }
        }
        if (
          row.water_temp_f != null &&
          ts >= cutoff24hMs &&
          (!latestTemp || ts > latestTemp.ts)
        ) {
          latestTemp = { ts, v: row.water_temp_f }
        }
      }

      const flowTrend = classifyTrend(
        priorN > 0 ? priorSum / priorN : null,
        recentN > 0 ? recentSum / recentN : null
      )

      // Hatch volume — distinct hatch names mentioned in past 7d.
      const hatchNames = new Set<string>()
      for (const row of (reports.data ?? []) as {
        hatches: Array<{ name?: string }> | null
      }[]) {
        for (const h of row.hatches ?? []) {
          if (h?.name) hatchNames.add(h.name.toLowerCase().trim())
        }
      }

      return {
        flowTrend,
        hatchVolume: classifyHatchVolume(hatchNames.size),
        waterTempF: latestTemp?.v ?? null,
        locationLabel,
      }
    },
  },
}
