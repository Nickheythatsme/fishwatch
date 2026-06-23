import { ImageResponse } from 'next/og'
import { ssrQuery } from '@/lib/graphql/execute'

export const runtime = 'nodejs'
export const revalidate = 1800
export const contentType = 'image/png'
export const size = { width: 1200, height: 630 }

const WATER_OG_QUERY = /* GraphQL */ `
  query WaterOg($slug: String!) {
    waterBody(slug: $slug) {
      name
      currentFlow
      currentSignal {
        compositeScore
        flowScore
        sentimentScore
        consensusScore
      }
    }
  }
`

interface WaterOgSignal {
  compositeScore: number
  flowScore: number | null
  sentimentScore: number | null
  consensusScore: number | null
}

interface WaterOgBody {
  name: string
  currentFlow: number | null
  currentSignal: WaterOgSignal | null
}

interface WaterOgData {
  waterBody: WaterOgBody | null
}

function isNoDataSignal(signal: WaterOgSignal): boolean {
  return (
    signal.compositeScore === 5.0 &&
    signal.flowScore == null &&
    signal.sentimentScore == null &&
    signal.consensusScore == null
  )
}

function scoreLabel(score: number): string {
  if (score >= 9) return 'Excellent'
  if (score >= 8) return 'Great'
  if (score >= 5) return 'Fair'
  if (score >= 3) return 'Poor'
  return 'Avoid'
}

function scoreColor(score: number): string {
  if (score >= 8) return '#4a7c3f'
  if (score >= 5) return '#8a6534'
  return '#c0392b'
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  let name = slug.replace(/-/g, ' ')
  let score: number | null = null
  let flow: number | null = null

  try {
    const data = await ssrQuery<WaterOgData>(WATER_OG_QUERY, { slug })
    if (data.waterBody) {
      name = data.waterBody.name
      flow = data.waterBody.currentFlow
      const sig = data.waterBody.currentSignal
      if (sig && !isNoDataSignal(sig)) {
        score = sig.compositeScore
      }
    }
  } catch {
    // Render a branded fallback with the slug-derived name
  }

  const formattedFlow =
    flow != null ? `${Math.round(flow).toLocaleString('en-US')} cfs` : null

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: '#0a2e4d',
          padding: '60px 80px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#7eb8e0', fontSize: 22, fontWeight: 700, letterSpacing: '0.1em' }}>
            SCORE.FISH
          </span>
          <span style={{ color: '#334155', fontSize: 22 }}>·</span>
          <span style={{ color: '#475569', fontSize: 22 }}>Fishing Report</span>
        </div>

        {/* Water name */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            justifyContent: 'center',
            paddingTop: 24,
            paddingBottom: 24,
          }}
        >
          <div
            style={{
              color: '#ffffff',
              fontSize: score != null ? 68 : 80,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              maxWidth: score != null ? 720 : 1000,
            }}
          >
            {name}
          </div>
        </div>

        {/* Score + flow row */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 56 }}>
          {score != null && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  color: scoreColor(score),
                  fontSize: 100,
                  fontWeight: 900,
                  lineHeight: 1,
                  letterSpacing: '-0.03em',
                }}
              >
                {score.toFixed(1)}
              </div>
              <div
                style={{
                  color: '#94a3b8',
                  fontSize: 22,
                  fontWeight: 500,
                  marginTop: 6,
                }}
              >
                {`${scoreLabel(score)} · out of 10`}
              </div>
            </div>
          )}

          {formattedFlow && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                paddingBottom: score != null ? 18 : 0,
              }}
            >
              <div
                style={{
                  color: '#7eb8e0',
                  fontSize: 40,
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                {formattedFlow}
              </div>
              <div style={{ color: '#64748b', fontSize: 20, marginTop: 6 }}>Current flow</div>
            </div>
          )}

          {score == null && formattedFlow == null && (
            <div style={{ color: '#64748b', fontSize: 28 }}>No current data</div>
          )}
        </div>
      </div>
    ),
    { ...size },
  )
}
