import type { Metadata } from 'next'
import { PricingPage } from '@/components/pricing/pricing-page'

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Compare Free, Pro, and Agency plans for Othman Real Estate.',
}

export default function PricingRoute() {
  return <PricingPage />
}
