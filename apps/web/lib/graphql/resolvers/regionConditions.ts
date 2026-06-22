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

// WMO weather interpretation codes → short, human-readable label.
// https://open-meteo.com/en/docs (see "Weather variable documentation").
function weatherCodeToLabel(code: number | null | undefined): string | null {
  if (code == null) return null
  if (code === 0) return 'Clear'
  if (code === 1) return 'Mostly clear'
  if (code === 2) return 'Partly cloudy'
  if (code === 3) return 'Overcast'
  if (code === 45 || code === 48) return 'Fog'
  if (code >= 51 && code <= 57) return 'Drizzle'
  if (code >= 61 && code <= 67) return 'Rain'
  if (code >= 71 && code <= 77) return 'Snow'
  if (code >= 80 && code <= 82) return 'Rain showers'
  if (code >= 85 && code <= 86) return 'Snow showers'
  if (code >= 95) return 'Thunderstorm'
  return null
}

interface CurrentWeather {
  airTempF: number | null
  weatherLabel: string | null
}

// Fetch current air temperature + conditions for the region centroid via
// Open-Meteo (free, key-less). Water temperature is too sparse across water
// bodies to be reliable, so the Local Conditions panel shows air weather
// instead. Failures degrade gracefully to nulls — this must never break the
// panel or the homepage.
async function fetchCurrentWeather(
  lat: number,
  lon: number
): Promise<CurrentWeather> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}` +
      `&longitude=${lon.toFixed(4)}` +
      `&current=temperature_2m,weather_code&temperature_unit=fahrenheit`
    // Cache for 30 min to align with the homepage's revalidate window and to
    // stay well within Open-Meteo's free usage limits.
    const res = await fetch(url, { next: { revalidate: 1800 } })
    if (!res.ok) return { airTempF: null, weatherLabel: null }
    const json = (await res.json()) as {
      current?: { temperature_2m?: number; weather_code?: number }
    }
    const temp = json.current?.temperature_2m
    return {
      airTempF: typeof temp === 'number' ? temp : null,
      weatherLabel: weatherCodeToLabel(json.current?.weather_code),
    }
  } catch {
    return { airTempF: null, weatherLabel: null }
  }
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
        .select('id, latitude, longitude')
        .eq('region', args.region)

      if (bodiesError) throw bodiesError
      const rows = (bodies ?? []) as {
        id: string
        latitude: number | null
        longitude: number | null
      }[]
      const ids = rows.map((b) => b.id)
      const locationLabel = titleCase(args.region)

      if (ids.length === 0) {
        return {
          flowTrend: null,
          hatchVolume: 'Light',
          airTempF: null,
          weatherLabel: null,
          locationLabel,
        }
      }

      const now = Date.now()
      const since48h = new Date(now - 48 * 60 * 60 * 1000).toISOString()
      const cutoff24hMs = now - 24 * 60 * 60 * 1000
      const since7dDate = new Date(now - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10)

      // Region centroid from the water-body coordinates, used to fetch a single
      // representative air-weather reading for the whole region.
      const coords = rows.filter(
        (r) => r.latitude != null && r.longitude != null
      )
      const centroid =
        coords.length > 0
          ? {
              lat:
                coords.reduce((s, r) => s + (r.latitude as number), 0) /
                coords.length,
              lon:
                coords.reduce((s, r) => s + (r.longitude as number), 0) /
                coords.length,
            }
          : null

      const [gauges, reports, weather] = await Promise.all([
        ctx.supabase
          .from('gauge_readings')
          .select('measured_at, flow_cfs')
          .in('water_body_id', ids)
          .gte('measured_at', since48h),
        ctx.supabase
          .from('parsed_reports')
          .select('hatches')
          .in('water_body_id', ids)
          .gte('report_date', since7dDate),
        centroid
          ? fetchCurrentWeather(centroid.lat, centroid.lon)
          : Promise.resolve<CurrentWeather>({ airTempF: null, weatherLabel: null }),
      ])
      if (gauges.error) throw gauges.error
      if (reports.error) throw reports.error

      // Flow trend — split into prior 24h vs last 24h, then compare averages.
      let priorSum = 0,
        priorN = 0,
        recentSum = 0,
        recentN = 0

      for (const row of (gauges.data ?? []) as {
        measured_at: string
        flow_cfs: number | null
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
        airTempF: weather.airTempF,
        weatherLabel: weather.weatherLabel,
        locationLabel,
      }
    },
  },
}
