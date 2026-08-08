'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/neon/server'
import { getPriceId } from '@/lib/stripe'
import { getUserById } from '@/services/user.service'

type CheckoutInput = {
  plan: 'pro' | 'agency'
  billing: 'month' | 'quarter' | 'year'
}

export async function createCheckoutSessionAction(input: CheckoutInput) {
  const dbClient = await createClient()
  const {
    data: { user },
  } = await dbClient.auth.getUser()

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

    // Reuse the existing Stripe customer if this profile already has one, so
    // repeat upgrades/downgrades don't fragment into multiple customers.
    const profile = await getUserById(user.id)

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/dashboard/profile?upgraded=1`,
      cancel_url: `${baseUrl}/pricing`,
      client_reference_id: user.id,
      customer_email: profile?.email,
      metadata: {
        userId: user.id,
        plan: input.plan,
        billing: input.billing,
      },
      // Stamped on the subscription itself, not just this checkout session,
      // so later subscription.updated/deleted webhook events (which don't
      // carry checkout session metadata) can still resolve back to a user
      // without relying solely on the stored Stripe customer id.
      subscription_data: {
        metadata: {
          userId: user.id,
          plan: input.plan,
        },
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
