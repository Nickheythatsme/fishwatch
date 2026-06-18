import { ssrQuery } from '@/lib/graphql/execute'
import { DashboardView } from '@/components/intelligence/DashboardView'
import type { RegionConditions } from '@/components/intelligence/LocalConditionsPanel'
import type { SortOption } from '@/components/intelligence/IntelligencePanel'
import {
  pickRegion,
  VALID_SORTS,
  type DashboardWaterBody,
} from '@/components/intelligence/dashboard-utils'

// Revalidate the server-rendered homepage every 30 minutes, aligned with the
// scoring pipeline cron so the indexed ranked list stays fresh without
// rebuilding on every request.
export const revalidate = 1800

const DASHBOARD_QUERY = /* GraphQL */ `
  query Dashboard {
    waterBodies {
      id
      name
      slug
      region
      latitude
      longitude
      typicalSpecies
      currentSignal {
        compositeScore
        flowScore
        sentimentScore
        consensusScore
        scoreDate
        topSection
      }
      currentFlow
    }
  }
`

const REGION_CONDITIONS_QUERY = /* GraphQL */ `
  query RegionConditions($region: String!) {
    regionConditions(region: $region) {
      flowTrend
      hatchVolume
      waterTempF
      locationLabel
    }
  }
`

interface DashboardData {
  waterBodies: DashboardWaterBody[]
}

interface RegionConditionsData {
  regionConditions: RegionConditions | null
}

function ErrorState() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <p className="rounded-2xl bg-error-container/30 p-6 text-error">
        Failed to load fishing data. Please try again.
      </p>
    </div>
  )
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>
}) {
  const { sort } = await searchParams
  const sortBy: SortOption = VALID_SORTS.includes(sort as SortOption)
    ? (sort as SortOption)
    : 'signal'

  let data: DashboardData
  try {
    data = await ssrQuery<DashboardData>(DASHBOARD_QUERY)
  } catch {
    return <ErrorState />
  }

  // graphql-js builds result objects with a null prototype, which React refuses
  // to serialize across the Server→Client boundary. DashboardView is a client
  // island, so copy each water body (and its nested signal) into plain object
  // literals before handing them over.
  const waterBodies: DashboardWaterBody[] = data.waterBodies.map((wb) => ({
    ...wb,
    currentSignal: wb.currentSignal ? { ...wb.currentSignal } : null,
  }))

  const region = pickRegion(waterBodies)

  // Region conditions depend on the chosen region, so this is a deliberate
  // second hop. A failure here only blanks the Local Conditions panel — it must
  // not take down the ranked list — so fall back to null.
  let regionConditions: RegionConditions | null = null
  try {
    const conditionsData = await ssrQuery<RegionConditionsData>(REGION_CONDITIONS_QUERY, {
      region,
    })
    regionConditions = conditionsData.regionConditions
      ? { ...conditionsData.regionConditions }
      : null
  } catch {
    regionConditions = null
  }

  return (
    <DashboardView
      waterBodies={waterBodies}
      region={region}
      regionConditions={regionConditions}
      sortBy={sortBy}
    />
  )
}
