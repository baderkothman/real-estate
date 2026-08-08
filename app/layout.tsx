import type { Metadata } from 'next'
import './globals.css'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { MobileNav } from '@/components/layout/mobile-nav'
import { CompareTray } from '@/components/property/compare-tray'
import { SupabaseProvider } from '@/components/providers/supabase-provider'
import { APP_DESCRIPTION, APP_NAME } from '@/lib/constants'

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  keywords: [
    'Lebanon real estate',
    'Beirut properties',
    'buy sell rent Lebanon',
  ],
  openGraph: {
    title: APP_NAME,
    description: APP_DESCRIPTION,
    type: 'website',
    locale: 'en_US',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-[#fcfaf7] text-[#181411] antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-[#181411] focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-white"
        >
          Skip to main content
        </a>
        <SupabaseProvider>
          <Header />
          {/* main gets bottom padding on mobile to clear the fixed nav */}
          <main id="main-content" className="flex-1 pb-[76px] md:pb-0">
            {children}
          </main>
          {/* Footer gets bottom padding on mobile to clear the fixed nav */}
          <div className="pb-[76px] md:pb-0">
            <Footer />
          </div>
          <MobileNav />
          <CompareTray />
        </SupabaseProvider>
      </body>
    </html>
  )
}
