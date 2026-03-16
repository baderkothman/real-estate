import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key || key === 'sk_test_placeholder') {
      // Return a mock stripe for development
      console.warn('Stripe secret key not configured. Using mock mode.')
    }
    stripeInstance = new Stripe(key || 'sk_test_placeholder', {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    })
  }
  return stripeInstance
}

export const stripe = getStripe()

export const PLAN_PRICE_IDS: Record<string, string> = {
  pro_month: process.env.STRIPE_PRICE_PRO_MONTH || 'price_pro_month',
  pro_quarter: process.env.STRIPE_PRICE_PRO_QUARTER || 'price_pro_quarter',
  pro_year: process.env.STRIPE_PRICE_PRO_YEAR || 'price_pro_year',
  agency_month: process.env.STRIPE_PRICE_AGENCY_MONTH || 'price_agency_month',
  agency_quarter:
    process.env.STRIPE_PRICE_AGENCY_QUARTER || 'price_agency_quarter',
  agency_year: process.env.STRIPE_PRICE_AGENCY_YEAR || 'price_agency_year',
}

export function getPriceId(plan: string, billing: string): string | undefined {
  return PLAN_PRICE_IDS[`${plan}_${billing}`]
}
