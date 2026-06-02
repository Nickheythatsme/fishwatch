import type { Metadata } from 'next'
import { Manrope, Newsreader } from 'next/font/google'
import { ApolloWrapper } from '@/lib/apollo/provider'
import { TopBar } from '@/components/shell/TopBar'
import { MobileNav } from '@/components/shell/MobileNav'
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
  title: 'FishWatch — Pacific Northwest Fishing Intelligence',
  description:
    'Real-time fishing conditions, reports, and signals for Pacific Northwest rivers and lakes.',
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
          <TopBar />
          <main className="pb-16 md:pb-0">{children}</main>
          <MobileNav />
        </ApolloWrapper>
      </body>
    </html>
  )
}
