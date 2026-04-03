import type { Metadata } from 'next'
import { ApolloWrapper } from '@/lib/apollo/provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'FishSignal — Central Oregon Fishing Intelligence',
  description:
    'Real-time fishing conditions, reports, and signals for Central Oregon rivers and lakes.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <ApolloWrapper>
          <header className="border-b bg-white">
            <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
              <a href="/" className="text-xl font-bold text-blue-700">
                FishSignal
              </a>
              <div className="flex gap-6 text-sm font-medium">
                <a href="/" className="hover:text-blue-600">
                  Dashboard
                </a>
                <a href="/reports" className="hover:text-blue-600">
                  Reports
                </a>
              </div>
            </nav>
          </header>
          <main>{children}</main>
        </ApolloWrapper>
      </body>
    </html>
  )
}
