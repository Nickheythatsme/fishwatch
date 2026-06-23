import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'
export const contentType = 'image/png'
export const size = { width: 1200, height: 630 }

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: '#0a2e4d',
          padding: '72px 96px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Brand */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              backgroundColor: '#1e6091',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #7eb8e0',
            }}
          >
            <span style={{ color: '#7eb8e0', fontSize: 26, fontWeight: 900 }}>S</span>
          </div>
          <span
            style={{
              color: '#7eb8e0',
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: '0.1em',
            }}
          >
            SCORE.FISH
          </span>
        </div>

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              color: '#ffffff',
              fontSize: 80,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
            }}
          >
            Pacific Northwest
          </div>
          <div
            style={{
              color: '#7eb8e0',
              fontSize: 80,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
            }}
          >
            Fishing Intelligence
          </div>
          <div
            style={{
              color: '#94a3b8',
              fontSize: 30,
              fontWeight: 400,
              marginTop: 32,
              maxWidth: 820,
              lineHeight: 1.4,
            }}
          >
            Real-time conditions from fly shop reports &amp; USGS gauge data
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ color: '#475569', fontSize: 20 }}>score.fish</span>
        </div>
      </div>
    ),
    { ...size },
  )
}
