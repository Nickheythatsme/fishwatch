import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'
export const contentType = 'image/png'
export const size = { width: 32, height: 32 }

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: '#0f426f',
          borderRadius: 6,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <span
          style={{
            color: '#7eb8e0',
            fontSize: 20,
            fontWeight: 900,
            lineHeight: 1,
          }}
        >
          S
        </span>
      </div>
    ),
    { ...size },
  )
}
