'use server'

import { headers } from 'next/headers'
import { getPriceId } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

type CheckoutInput = {
  plan: 'pro' | 'agency'
  billing: 'month' | 'quarter' | 'year'
}

export async function createCheckoutSessionAction(input: CheckoutInput) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  try {
    const priceId = getPriceId(input.plan, input.billing)

    if (
      !priceId ||
      (priceId.startsWith('price_') && !priceId.includes('_test_'))
    ) {
      return {
        error:
          'Stripe is not configured. Set your STRIPE_SECRET_KEY and price IDs in .env.local to enable payments.',
      }
    }

    const stripe = (await import('@/lib/stripe')).stripe
    const headerList = await headers()
    const baseUrl = headerList.get('origin') ?? 'http://localhost:3000'

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/dashboard/profile?upgraded=1`,
      cancel_url: `${baseUrl}/pricing`,
      metadata: {
        userId: user.id,
        plan: input.plan,
        billing: input.billing,
      },
    })

    return { url: checkoutSession.url }
  } catch (err) {
    console.error('Checkout error:', err)
    return {
      error:
        'Checkout unavailable. Please configure Stripe to enable payments.',
    }
  }
}
