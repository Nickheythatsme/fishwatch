/**
 * SEO audit: lists non-publishable water pages and the reason each is excluded.
 * Mirrors the isPublishable() logic in lib/seo/gating.ts exactly.
 *
 * Usage:
 *   npm run seo:audit              # hits http://localhost:3000 (npm run dev first)
 *   GRAPHQL_URL=https://score.fish/api/graphql npm run seo:audit
 */

const PUBLISH_REPORT_WINDOW_DAYS = 21

const GRAPHQL_URL = process.env.GRAPHQL_URL ?? 'http://localhost:3000/api/graphql'

const QUERY = /* GraphQL */ `
  query SeoAudit {
    waterBodies {
      slug
      currentSignal {
        compositeScore
        flowScore
        sentimentScore
        consensusScore
        scoreDate
      }
      recentReports(limit: 1) {
        reportDate
      }
    }
  }
`

function isNoDataSignal(signal) {
  return (
    signal.compositeScore === 5.0 &&
    signal.flowScore == null &&
    signal.sentimentScore == null &&
    signal.consensusScore == null
  )
}

function isPublishable(signal, latestReportDate) {
  if (!signal || isNoDataSignal(signal)) return false
  if (!latestReportDate) return false
  const parts = latestReportDate.split('-')
  if (parts.length !== 3) return false
  const reportUtc = Date.UTC(+parts[0], +parts[1] - 1, +parts[2])
  const now = new Date()
  const nowUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.floor((nowUtc - reportUtc) / (1000 * 60 * 60 * 24)) <= PUBLISH_REPORT_WINDOW_DAYS
}

function diagnose(wb) {
  const { currentSignal } = wb
  const latestReportDate = wb.recentReports[0]?.reportDate ?? null

  if (!currentSignal) return 'no signal'
  if (isNoDataSignal(currentSignal)) return 'no-data signal (placeholder)'
  if (!latestReportDate) return 'no reports'

  const parts = latestReportDate.split('-')
  const reportUtc = Date.UTC(+parts[0], +parts[1] - 1, +parts[2])
  const now = new Date()
  const nowUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.floor((nowUtc - reportUtc) / (1000 * 60 * 60 * 24))
  return `stale reports (${diffDays}d > ${PUBLISH_REPORT_WINDOW_DAYS}d window)`
}

async function main() {
  let waters

  try {
    const res = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: QUERY }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
    const json = await res.json()
    if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join('; '))
    if (!json.data) throw new Error('No data returned')
    waters = json.data.waterBodies
  } catch (err) {
    console.error(`\nFailed to reach ${GRAPHQL_URL}`)
    console.error('Make sure the dev server is running: npm run dev')
    console.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }

  const thin = []

  for (const wb of waters) {
    const latestReportDate = wb.recentReports[0]?.reportDate ?? null
    if (!isPublishable(wb.currentSignal, latestReportDate)) {
      thin.push({ slug: wb.slug, reason: diagnose(wb) })
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  console.log(`\nSEO Audit — ${today}`)
  console.log(`Total waters  : ${waters.length}`)
  console.log(`Publishable   : ${waters.length - thin.length}`)
  console.log(`Non-publishable (noindex + excluded from sitemap): ${thin.length}`)

  if (thin.length === 0) {
    console.log('\nAll waters are publishable.\n')
    return
  }

  console.log()
  for (const { slug, reason } of thin.sort((a, b) => a.slug.localeCompare(b.slug))) {
    console.log(`  ${slug.padEnd(42)} ${reason}`)
  }
  console.log()
}

main()
