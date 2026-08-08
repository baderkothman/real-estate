import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'

/**
 * Real Stripe integration, reusing the same `STRIPE_SECRET_KEY` already
 * configured for SaaS plan billing — a one-time Checkout session (`mode:
 * 'payment'`), the same pattern already used for subscriptions in
 * app/actions/checkout.ts. This is NOT Stripe Connect: the payment lands in
 * the platform's own Stripe balance, not a connected seller/landlord
 * account. Paying it out to the seller/landlord requires Connect
 * (`STRIPE_CONNECT_CLIENT_ID`, not configured) — until then, that step is
 * manual and `transactions.payout_status` stays `not_started`.
 */
export async function createDepositCheckoutSession(input: {
  transactionId: string
  amount: number
  currency: string
  buyerEmail?: string
}) {
  const headerList = await headers()
  const baseUrl = headerList.get('origin') ?? 'http://localhost:3000'

  return stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: input.currency,
          product_data: {
            name: 'Transaction deposit',
            description: 'Payment held by Stripe, not an escrow account.',
          },
          unit_amount: Math.round(input.amount * 100),
        },
        quantity: 1,
      },
    ],
    customer_email: input.buyerEmail,
    success_url: `${baseUrl}/dashboard/transactions/${input.transactionId}?payment=success`,
    cancel_url: `${baseUrl}/dashboard/transactions/${input.transactionId}?payment=cancelled`,
    metadata: {
      transactionId: input.transactionId,
      purpose: 'deposit',
    },
  })
}
