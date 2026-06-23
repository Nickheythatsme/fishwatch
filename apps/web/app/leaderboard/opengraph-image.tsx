import { ImageResponse } from 'next/og'
import { ssrQuery } from '@/lib/graphql/execute'

export const runtime = 'nodejs'
export const revalidate = 1800
export const contentType = 'image/png'
export const size = { width: 1200, height: 630 }

const LEADERBOARD_OG_QUERY = /* GraphQL */ `
  query LeaderboardOg {
    waterBodies {
      name
      currentSignal {
        compositeScore
        flowScore
        sentimentScore
        consensusScore
      }
    }
  }
`

interface LeaderboardOgSignal {
  compositeScore: number
  flowScore: number | null
  sentimentScore: number | null
  consensusScore: number | null
}

interface LeaderboardOgWater {
  name: string
  currentSignal: LeaderboardOgSignal | null
}

interface LeaderboardOgData {
  waterBodies: LeaderboardOgWater[]
}

function isNoDataSignal(signal: LeaderboardOgSignal): boolean {
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

const RANK_COLORS = ['#f59e0b', '#94a3b8', '#cd7f32']

export default async function Image() {
  let topWaters: { name: string; score: number }[] = []

  try {
    const data = await ssrQuery<LeaderboardOgData>(LEADERBOARD_OG_QUERY)
    topWaters = data.waterBodies
      .filter((wb) => wb.currentSignal != null && !isNoDataSignal(wb.currentSignal))
      .sort((a, b) => b.currentSignal!.compositeScore - a.currentSignal!.compositeScore)
      .slice(0, 3)
      .map((wb) => ({ name: wb.name, score: wb.currentSignal!.compositeScore }))
  } catch {
    // Render branded fallback with no water list
  }

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
          <span style={{ color: '#475569', fontSize: 22 }}>Pacific Northwest</span>
        </div>

        {/* Headline */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 32 }}>
          <div
            style={{
              color: '#ffffff',
              fontSize: 64,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
            }}
          >
            Today&apos;s Top Waters
          </div>
          <div style={{ color: '#64748b', fontSize: 24, marginTop: 10 }}>
            Ranked by composite fishing score
          </div>
        </div>

        {/* Top waters list */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            marginTop: 36,
            flex: 1,
          }}
        >
          {topWaters.length > 0 ? (
            topWaters.map((water, i) => (
              <div
                key={water.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 24,
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  borderRadius: 12,
                  padding: '16px 24px',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <span
                  style={{
                    color: RANK_COLORS[i] ?? '#64748b',
                    fontSize: 32,
                    fontWeight: 800,
                    minWidth: 36,
                  }}
                >
                  {i + 1}
                </span>
                <span
                  style={{
                    color: '#e2e8f0',
                    fontSize: 28,
                    fontWeight: 600,
                    flex: 1,
                  }}
                >
                  {water.name}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span
                    style={{
                      color: scoreColor(water.score),
                      fontSize: 32,
                      fontWeight: 800,
                      lineHeight: 1,
                    }}
                  >
                    {water.score.toFixed(1)}
                  </span>
                  <span style={{ color: '#64748b', fontSize: 16, marginTop: 2 }}>
                    {scoreLabel(water.score)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div style={{ color: '#64748b', fontSize: 28, marginTop: 16 }}>
              Conditions updated every 30 minutes
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', marginTop: 20 }}>
          <span style={{ color: '#334155', fontSize: 18 }}>
            Updated every 30 minutes · score.fish
          </span>
        </div>
      </div>
    ),
    { ...size },
  )
}
