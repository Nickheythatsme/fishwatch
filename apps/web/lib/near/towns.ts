export interface Town {
  name: string
  slug: string
  lat: number
  lon: number
  state: string
}

export const TOWNS: Town[] = [
  { name: 'Bend', slug: 'bend-or', lat: 44.0582, lon: -121.3153, state: 'OR' },
  { name: 'Sisters', slug: 'sisters-or', lat: 44.2901, lon: -121.5493, state: 'OR' },
  { name: 'Redmond', slug: 'redmond-or', lat: 44.2726, lon: -121.1488, state: 'OR' },
  { name: 'Sunriver', slug: 'sunriver-or', lat: 43.8775, lon: -121.4434, state: 'OR' },
  { name: 'Maupin', slug: 'maupin-or', lat: 45.1776, lon: -121.0849, state: 'OR' },
  { name: 'Medford', slug: 'medford-or', lat: 42.3265, lon: -122.8756, state: 'OR' },
  { name: 'Grants Pass', slug: 'grants-pass-or', lat: 42.4391, lon: -123.3284, state: 'OR' },
  { name: 'Hood River', slug: 'hood-river-or', lat: 45.7054, lon: -121.5219, state: 'OR' },
  { name: 'Yakima', slug: 'yakima-wa', lat: 46.6021, lon: -120.5059, state: 'WA' },
  { name: 'Portland', slug: 'portland-or', lat: 45.5231, lon: -122.6765, state: 'OR' },
]

/** Maximum distance from a town to include a water body on its near page. */
export const MAX_NEAR_DISTANCE_MILES = 200
