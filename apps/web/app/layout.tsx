import type { Metadata, Viewport } from 'next'
import { Manrope, Newsreader } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { ApolloWrapper } from '@/lib/apollo/provider'
import { TopBar } from '@/components/shell/TopBar'
import { MobileNav } from '@/components/shell/MobileNav'
import { NavigationHistoryProvider } from '@/components/shell/NavigationHistoryProvider'
import './globals.css'

const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-headline',
  display: 'swap',
  // Newsreader lacks font-override metrics in Next's database; skipping the
  // fallback adjuster avoids a build warning. CLS impact is negligible since
  // we still get `display: swap`.
  adjustFontFallback: false,
})

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Score.Fish — Pacific Northwest Fishing Intelligence',
  description:
    'Real-time fishing conditions, reports, and signals for Pacific Northwest rivers and lakes.',
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-96x96.png', type: 'image/png', sizes: '96x96' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  appleWebApp: {
    title: 'Score.Fish',
    statusBarStyle: 'default',
  },
}

export const viewport: Viewport = {
  themeColor: '#0f426f',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${newsreader.variable} ${manrope.variable}`}>
      <body className="min-h-screen bg-surface font-body text-on-surface antialiased">
        <ApolloWrapper>
          <NavigationHistoryProvider>
            <TopBar />
            <main className="pb-16 md:pb-0">{children}</main>
            <MobileNav />
          </NavigationHistoryProvider>
        </ApolloWrapper>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
