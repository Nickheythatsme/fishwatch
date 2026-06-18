import type { MetadataRoute } from 'next'

// Web App Manifest for score.fish. Reuses the brand icon set added in PR #47
// (served from `public/`). Next injects the `<link rel="manifest">` tag
// automatically from this file convention, so the root layout no longer needs an
// explicit `manifest` reference.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Score.Fish — Pacific Northwest Fishing Intelligence',
    short_name: 'Score.Fish',
    description:
      'Real-time fishing conditions, reports, and signals for Pacific Northwest rivers and lakes.',
    theme_color: '#0f426f',
    background_color: '#f8faf9',
    display: 'standalone',
    start_url: '/',
    icons: [
      {
        src: '/web-app-manifest-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/web-app-manifest-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/web-app-manifest-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/web-app-manifest-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
