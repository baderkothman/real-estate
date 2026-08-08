import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getPlanFromPriceId, stripe } from '@/lib/stripe'
import {
  markDepositSucceeded,
  recordDisputeOpened,
} from '@/services/payment.service'
import {
  getUserByStripeCustomerId,
  syncBillingFromStripe,
} from '@/services/user.service'
import type { Plan } from '@/types'

// The one route handler this app genuinely needs: Stripe posts webhook
// events directly, unauthenticated by any app session, so this can't be
// a Server Action. This is what closes the previously-unclosed billing loop
// — before this route existed, a successful checkout never updated
// `profiles.plan`; only a manual admin override did.
//
// Plan sync here is idempotent by construction (setting plan/customer id to
// the same value twice is harmless), which is sufficient for this low-risk
// subscription-sync use case. Real financial/transaction webhooks (payments,
// transfers — a later milestone) will need explicit event-id idempotency
// tracking via the `events` table introduced in this same migration set.

function isSubscriptionActive(status: Stripe.Subscription.Status) {
  return status === 'active' || status === 'trialing'
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.warn(
      'Stripe webhook received but STRIPE_WEBHOOK_SECRET is not configured — skipping processing.'
    )
    return NextResponse.json(
      { received: true, warning: 'stripe webhook secret not configured' },
      { status: 200 }
    )
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const rawBody = await request.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // Two unrelated flows share this event: SaaS plan subscription
        // checkout (mode: 'subscription') and transaction deposit checkout
        // (mode: 'payment', metadata.purpose === 'deposit'). Disambiguate
        // by mode rather than assuming — this route must not conflate a
        // plan payment with a transaction payment.
        if (
          session.mode === 'payment' &&
          session.metadata?.purpose === 'deposit'
        ) {
          const paymentIntentId =
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent?.id

          if (paymentIntentId) {
            await markDepositSucceeded(session.id, paymentIntentId)
          } else {
            console.error(
              'Deposit checkout completed without a payment_intent',
              {
                sessionId: session.id,
              }
            )
          }
          break
        }

        const userId = session.metadata?.userId ?? session.client_reference_id
        const plan = session.metadata?.plan as Plan | undefined
        const customerId =
          typeof session.customer === 'string'
            ? session.customer
            : session.customer?.id
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id

        if (userId && plan && (plan === 'pro' || plan === 'agency')) {
          await syncBillingFromStripe(userId, {
            plan,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId ?? undefined,
          })
        } else {
          console.error(
            'checkout.session.completed missing userId/plan metadata',
            { sessionId: session.id }
          )
        }
        break
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute
        const paymentIntentId =
          typeof dispute.payment_intent === 'string'
            ? dispute.payment_intent
            : undefined

        if (paymentIntentId) {
          await recordDisputeOpened({
            providerPaymentIntentId: paymentIntentId,
            providerDisputeId: dispute.id,
            reason: dispute.reason,
          })
        }
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.userId
        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer.id
        const priceId = subscription.items.data[0]?.price?.id
        const mappedPlan = priceId ? getPlanFromPriceId(priceId) : null

        const profile = userId
          ? null
          : await getUserByStripeCustomerId(customerId)
        const resolvedUserId = userId ?? profile?.id

        if (!resolvedUserId) {
          console.error(
            'Subscription event could not be matched to a profile',
            { customerId, subscriptionId: subscription.id }
          )
          break
        }

        const plan: Plan = isSubscriptionActive(subscription.status)
          ? (mappedPlan ?? 'free')
          : 'free'

        await syncBillingFromStripe(resolvedUserId, {
          plan,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
        })
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.userId
        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer.id

        const profile = userId
          ? null
          : await getUserByStripeCustomerId(customerId)
        const resolvedUserId = userId ?? profile?.id

        if (!resolvedUserId) {
          console.error(
            'Subscription deletion could not be matched to a profile',
            { customerId, subscriptionId: subscription.id }
          )
          break
        }

        await syncBillingFromStripe(resolvedUserId, {
          plan: 'free',
          stripeSubscriptionId: null,
        })
        break
      }

      default:
        // Unhandled event types are expected — Stripe sends far more than
        // this app needs to act on. No-op, acknowledge receipt.
        break
    }
  } catch (err) {
    console.error('Stripe webhook handler error:', err)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      {
        status: 500,
      }
    )
  }

  return NextResponse.json({ received: true })
}
