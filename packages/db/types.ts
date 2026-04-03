export interface WaterBody {
  id: string
  name: string
  slug: string
  region: string
  latitude: number
  longitude: number
  description: string | null
  usgs_station_ids: string[]
  typical_species: string[]
  created_at: string
}

export interface Species {
  id: string
  name: string
  common_aliases: string[]
  created_at: string
}

export interface FlyPattern {
  id: string
  name: string
  aliases: string[]
  category: string | null
  typical_sizes: string | null
  created_at: string
}

export interface RawReport {
  id: string
  source_name: string
  source_url: string
  content_hash: string
  raw_html: string
  fetched_at: string
  is_processed: boolean
}

export interface ParsedReport {
  id: string
  raw_report_id: string
  water_body_id: string | null
  source_name: string
  report_date: string | null
  sentiment: 'excellent' | 'good' | 'fair' | 'poor' | 'off' | null
  species_mentioned: string[]
  fly_patterns_mentioned: string[]
  conditions_summary: string | null
  flow_commentary: string | null
  water_clarity: string | null
  raw_extraction: Record<string, unknown> | null
  extracted_at: string
}

export interface GaugeReading {
  id: string
  station_id: string
  water_body_id: string | null
  measured_at: string
  flow_cfs: number | null
  gauge_height_ft: number | null
  water_temp_f: number | null
  fetched_at: string
}

export interface WaterScore {
  id: string
  water_body_id: string
  score_date: string
  composite_score: number
  flow_score: number | null
  sentiment_score: number | null
  consensus_score: number | null
  recommended_species: string[]
  recommended_flies: string[]
  summary: string | null
  components: Record<string, unknown> | null
  scored_at: string
}
