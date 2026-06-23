import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo/metadata'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Explicitly allow AI answer-engine crawlers so our per-water fishing
      // intelligence pages are indexed by AI-powered search and assistants.
      // Score.Fish publishes real-time public data — AI inclusion is desirable.
      // Each AI bot needs its own `/api/` disallow: per robots.txt semantics a
      // crawler obeys only its single most-specific matching group, so these
      // groups do NOT inherit the catch-all's `disallow: '/api/'` below.
      { userAgent: 'GPTBot', allow: '/', disallow: '/api/' },
      { userAgent: 'OAI-SearchBot', allow: '/', disallow: '/api/' },
      { userAgent: 'PerplexityBot', allow: '/', disallow: '/api/' },
      { userAgent: 'Google-Extended', allow: '/', disallow: '/api/' },
      // Catch-all: allow all content; block API routes (no indexable content).
      { userAgent: '*', allow: '/', disallow: '/api/' },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
