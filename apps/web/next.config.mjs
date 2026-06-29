/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== 'production'

// Content Security Policy. Tiles load from Mapbox + OpenStreetMap; data/auth
// from Supabase. Google Analytics (gtag.js) loads from googletagmanager.com and
// beacons to google-analytics.com. Microsoft Clarity bootstraps an external
// tag from www.clarity.ms and beacons session data to *.clarity.ms. Next.js
// injects inline bootstrap scripts, so 'unsafe-inline' is required for
// script-src; dev additionally needs 'unsafe-eval' for HMR.
const csp = [
  `default-src 'self'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  `object-src 'none'`,
  `img-src 'self' data: blob: https://api.mapbox.com https://*.tile.openstreetmap.org`,
  `connect-src 'self' https://*.supabase.co https://api.mapbox.com https://*.google-analytics.com https://*.analytics.google.com https://www.clarity.ms https://*.clarity.ms`,
  `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.clarity.ms${isDev ? " 'unsafe-eval'" : ''}`,
  `style-src 'self' 'unsafe-inline'`,
  `font-src 'self' data:`,
  `worker-src 'self' blob:`,
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=()' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
]

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
