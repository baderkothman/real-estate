import type { Metadata } from 'next'
import './globals.css'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
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
        <SupabaseProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </SupabaseProvider>
      </body>
    </html>
  )
}
