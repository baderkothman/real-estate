'use server'

import { createClient } from '@/lib/neon/server'
import { createDepositCheckoutSession } from '@/lib/payments/stripe-provider'
import { createPendingDepositIntent } from '@/services/payment.service'
import { getRegionalRule } from '@/services/regional-rules.service'
import { getTransactionById } from '@/services/transaction.service.server'
import { getUserById } from '@/services/user.service'

async function getAuthenticatedUserId() {
  const dbClient = await createClient()
  const {
    data: { user },
  } = await dbClient.auth.getUser()
  return user?.id ?? null
}

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

export async function createDepositCheckoutSessionAction(
  transactionId: string,
  amount: number
) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  if (!amount || amount <= 0) {
    return { error: 'Enter a valid deposit amount' }
  }

  // RLS-scoped to transaction parties — null means not found or not a party.
  const transaction = await getTransactionById(transactionId)
  if (!transaction) return { error: 'Transaction not found' }

  if (transaction.sourceType === 'offer') {
    const dbClient = await createClient()
    const { data: offer } = await dbClient
      .from('offers')
      .select('current_revision:offer_revisions!current_revision_id(price)')
      .eq('id', transaction.sourceId)
      .single()

    const dealPrice = (
      offer as unknown as { current_revision: { price: number } | null } | null
    )?.current_revision?.price

    if (dealPrice) {
      const minPercent = await getRegionalRule<number>('deposit_min_percent')
      const maxPercent = await getRegionalRule<number>('deposit_max_percent')
      if (minPercent && amount < (dealPrice * minPercent) / 100) {
        return {
          error: `The minimum deposit for this offer is ${minPercent}% of the offer price.`,
        }
      }
      if (maxPercent && amount > (dealPrice * maxPercent) / 100) {
        return {
          error: `The maximum deposit for this offer is ${maxPercent}% of the offer price.`,
        }
      }
    }
  }

  try {
    const profile = await getUserById(userId)
    const session = await createDepositCheckoutSession({
      transactionId,
      amount,
      currency: 'usd',
      buyerEmail: profile?.email,
    })

    if (!session.id || !session.url) {
      return {
        error:
          'Stripe is not configured. Set STRIPE_SECRET_KEY to enable payments.',
      }
    }

    await createPendingDepositIntent({
      transactionId,
      amount,
      currency: 'usd',
      checkoutSessionId: session.id,
    })

    return { url: session.url }
  } catch (err) {
    console.error('Create deposit checkout session error:', err)
    return { error: errorMessage(err, 'Failed to start payment') }
  }
}
