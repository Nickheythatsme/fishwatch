import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ssrQuery } from '@/lib/graphql/execute'
import { buildBasinMetadata, SITE_URL } from '@/lib/seo/metadata'
import { buildBreadcrumbList, buildItemList, assembleGraph } from '@/lib/seo/jsonld'
import { JsonLd } from '@/components/seo/JsonLd'
import { Breadcrumbs, type Crumb } from '@/components/shell/Breadcrumbs'
import { BackButton } from '@/components/shell/BackButton'
import { IntelligenceCard, type IntelligenceCardWaterBody } from '@/components/intelligence/IntelligenceCard'

export const revalidate = 1800
export const dynamicParams = true

const BASIN_PAGE_QUERY = /* GraphQL */ `
  query BasinPage($slug: String!) {
    basin(slug: $slug) {
      id
      name
      slug
      region
      description
      waters {
        id
        name
        slug
        typicalSpecies
        currentFlow
        currentSignal {
          compositeScore
          flowScore
          sentimentScore
          consensusScore
          topSection
        }
      }
    }
  }
`

const BASIN_SLUGS_QUERY = /* GraphQL */ `
  query BasinSlugs {
    basins {
      slug
    }
  }
`

interface Basin {
  id: string
  name: string
  slug: string
  region: string
  description: string | null
  waters: IntelligenceCardWaterBody[]
}

interface BasinPageData {
  basin: Basin | null
}

interface BasinSlugsData {
  basins: { slug: string }[]
}

export async function generateStaticParams() {
  try {
    const data = await ssrQuery<BasinSlugsData>(BASIN_SLUGS_QUERY)
    return data.basins.map((b) => ({ slug: b.slug }))
  } catch {
    // If basins table is empty or unreachable at build time, rely on on-demand
    // rendering (`dynamicParams = true`) instead of failing the build.
    return []
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  let data: BasinPageData
  try {
    data = await ssrQuery<BasinPageData>(BASIN_PAGE_QUERY, { slug })
  } catch {
    return {}
  }
  if (!data.basin) return {}
  return buildBasinMetadata(data.basin)
}

export default async function BasinPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  let data: BasinPageData
  try {
    data = await ssrQuery<BasinPageData>(BASIN_PAGE_QUERY, { slug })
  } catch {
    notFound()
  }

  if (!data.basin) notFound()

  const basin = data.basin

  // Rank waters by composite score descending; waters with no current signal
  // sink to the bottom (score −1 sentinel keeps the sort stable).
  const sortedWaters = [...basin.waters].sort(
    (a, b) =>
      (b.currentSignal?.compositeScore ?? -1) - (a.currentSignal?.compositeScore ?? -1)
  )

  const breadcrumbs: Crumb[] = [
    { label: 'Home', href: '/' },
    { label: basin.name },
  ]

  const jsonLd = assembleGraph([
    buildBreadcrumbList(breadcrumbs, SITE_URL),
    buildItemList(
      sortedWaters.map((w) => ({ name: w.name, slug: w.slug })),
      SITE_URL,
      `${basin.name} Waters`
    ),
  ])

  // graphql-js returns null-prototype objects; spread to plain objects so React
  // can serialize them across the Server→Client boundary to IntelligenceCard.
  const waters: IntelligenceCardWaterBody[] = sortedWaters.map((w) => ({
    ...w,
    currentSignal: w.currentSignal ? { ...w.currentSignal } : null,
  }))

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {jsonLd && <JsonLd data={jsonLd} />}
      <BackButton className="mb-4 md:hidden" />
      <Breadcrumbs items={breadcrumbs} className="mb-4" />

      <section className="rounded-2xl bg-surface-container-low p-6 sm:p-8">
        <h1 className="font-headline text-4xl italic text-primary">{basin.name}</h1>
        {basin.description && (
          <p className="mt-3 max-w-prose font-body text-base leading-relaxed text-on-surface-variant">
            {basin.description}
          </p>
        )}
        <p className="mt-2 font-label text-xs text-on-surface-variant">
          {waters.length} water{waters.length !== 1 ? 's' : ''} · conditions updated every 30
          minutes
        </p>
      </section>

      {waters.length > 0 ? (
        <section className="mt-8" aria-labelledby="basin-waters-heading">
          <h2
            id="basin-waters-heading"
            className="mb-4 font-headline text-lg font-bold text-on-surface"
          >
            Fishing Conditions
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {waters.map((water) => (
              <IntelligenceCard key={water.id} waterBody={water} />
            ))}
          </div>
        </section>
      ) : (
        <p className="mt-8 font-body text-sm text-on-surface-variant">
          No waters in this basin yet — check back soon.
        </p>
      )}
    </div>
  )
}
