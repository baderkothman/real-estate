import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getPriceId } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json()) as { plan: string; billing: string }
    const { plan, billing } = body

    const priceId = getPriceId(plan, billing)

    if (
      !priceId ||
      (priceId.startsWith('price_') && !priceId.includes('_test_'))
    ) {
      // Mock mode — Stripe not configured
      return NextResponse.json(
        {
          error:
            'Stripe is not configured. Set your STRIPE_SECRET_KEY and price IDs in .env.local to enable payments.',
        },
        { status: 503 }
      )
    }

    // In production with real Stripe keys:
    const stripe = (await import('@/lib/stripe')).stripe
    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/dashboard/profile?upgraded=1`,
      cancel_url: `${baseUrl}/pricing`,
      metadata: {
        userId: session.user.id,
        plan,
        billing,
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (err) {
    console.error('Checkout error:', err)
    return NextResponse.json(
      {
        error:
          'Checkout unavailable. Please configure Stripe to enable payments.',
      },
      { status: 503 }
    )
  }
}
