import { randomUUID } from 'node:crypto'
import { createAdminClient } from '@/lib/neon/admin'
import { createClient } from '@/lib/neon/server'
import { applyCommissionToTransaction } from '@/services/commission.service'
import { createNotification } from '@/services/notification.service.server'

export type PaymentIntentStatus =
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'requires_capture'
  | 'succeeded'
  | 'canceled'

export interface PaymentRecord {
  id: string
  amount: number
  capturedAt?: Date
  heldBy: string
  releasedAt?: Date
}

export interface PaymentIntentRecord {
  id: string
  transactionId: string
  purpose: string
  amount: number
  currency: string
  status: PaymentIntentStatus
  createdAt: Date
  payments: PaymentRecord[]
}

interface PaymentIntentRow {
  id: string
  transaction_id: string
  purpose: string
  amount: number
  currency: string
  status: PaymentIntentStatus
  created_at: string
  payments: {
    id: string
    amount: number
    captured_at: string | null
    held_by: string
    released_at: string | null
  }[]
}

function dbRowToPaymentIntent(row: PaymentIntentRow): PaymentIntentRecord {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    purpose: row.purpose,
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status,
    createdAt: new Date(row.created_at),
    payments: (row.payments ?? []).map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      capturedAt: p.captured_at ? new Date(p.captured_at) : undefined,
      heldBy: p.held_by,
      releasedAt: p.released_at ? new Date(p.released_at) : undefined,
    })),
  }
}

export async function getPaymentIntentsForTransaction(
  transactionId: string
): Promise<PaymentIntentRecord[]> {
  const dbClient = await createClient()
  const { data, error } = await dbClient
    .from('payment_intents')
    .select('*, payments(id, amount, captured_at, held_by, released_at)')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return (data as unknown as PaymentIntentRow[]).map(dbRowToPaymentIntent)
}

/**
 * Records a payment_intents row the moment a Checkout session is created —
 * `provider_intent_id` initially holds the *Checkout Session* id (the only
 * id we have at this point); the webhook handler overwrites it with the
 * actual PaymentIntent id once Stripe reports success, and moves status to
 * 'succeeded'.
 */
export async function createPendingDepositIntent(input: {
  transactionId: string
  amount: number
  currency: string
  checkoutSessionId: string
}): Promise<string> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('payment_intents')
    .insert({
      transaction_id: input.transactionId,
      purpose: 'deposit',
      amount: input.amount,
      currency: input.currency,
      provider_intent_id: input.checkoutSessionId,
      status: 'processing',
    })
    .select('id')
    .single()

  if (error || !data)
    throw new Error(error?.message ?? 'Failed to record payment intent')
  return data.id as string
}

/**
 * Applies a successful Stripe checkout to our records: resolves the
 * payment_intents row by the Checkout Session id, marks it succeeded,
 * inserts the payment, posts a balanced ledger entry pair, moves
 * `transactions.payment_status` to 'held' (payment collected, sitting in
 * the platform's Stripe balance — not escrow), and computes commission
 * once. Called only from the Stripe webhook handler.
 */
export async function markDepositSucceeded(
  checkoutSessionId: string,
  actualPaymentIntentId: string
): Promise<void> {
  const admin = createAdminClient()

  const { data: intentRow } = await admin
    .from('payment_intents')
    .select('id, transaction_id, amount, currency')
    .eq('provider_intent_id', checkoutSessionId)
    .eq('status', 'processing')
    .maybeSingle()

  if (!intentRow) {
    console.error(
      'No matching pending deposit intent for checkout session',
      checkoutSessionId
    )
    return
  }

  await admin
    .from('payment_intents')
    .update({ provider_intent_id: actualPaymentIntentId, status: 'succeeded' })
    .eq('id', intentRow.id)

  const { data: payment, error: paymentError } = await admin
    .from('payments')
    .insert({
      payment_intent_id: intentRow.id,
      amount: intentRow.amount,
      captured_at: new Date().toISOString(),
      held_by: 'stripe',
    })
    .select('id')
    .single()

  if (paymentError || !payment) {
    console.error('Failed to record payment:', paymentError)
    return
  }

  const entryGroupId = randomUUID()
  await admin.from('ledger_entries').insert([
    {
      transaction_id: intentRow.transaction_id,
      entry_group_id: entryGroupId,
      account: 'buyer_funds_held',
      direction: 'debit',
      amount: intentRow.amount,
      currency: intentRow.currency,
      related_payment_id: payment.id,
      memo: 'Deposit collected via Stripe Checkout',
    },
    {
      transaction_id: intentRow.transaction_id,
      entry_group_id: entryGroupId,
      account: 'platform_held_funds',
      direction: 'credit',
      amount: intentRow.amount,
      currency: intentRow.currency,
      related_payment_id: payment.id,
      memo: 'Deposit held in platform Stripe balance',
    },
  ])

  await admin
    .from('transactions')
    .update({ payment_status: 'held' })
    .eq('id', intentRow.transaction_id)

  await applyCommissionToTransaction(
    intentRow.transaction_id,
    Number(intentRow.amount)
  ).catch((err) => {
    console.error('Failed to apply commission:', err)
  })

  await notifyTransactionParties(intentRow.transaction_id, admin, {
    type: 'payment_received',
    title: 'A deposit payment was received',
  })
}

/**
 * Uses the admin client (not the request-scoped one) deliberately — this
 * runs from the Stripe webhook, which has no user session/cookies to scope
 * RLS to, so a request-scoped read of offers/rental_applications would see
 * zero rows and silently notify no one.
 */
async function notifyTransactionParties(
  transactionId: string,
  admin: ReturnType<typeof createAdminClient>,
  notification: { type: string; title: string }
): Promise<void> {
  const { data: transaction } = await admin
    .from('transactions')
    .select('source_type, source_id')
    .eq('id', transactionId)
    .single()

  if (!transaction) return

  const profileIds: string[] = []

  if (transaction.source_type === 'offer') {
    const { data: offer } = await admin
      .from('offers')
      .select(
        'buyer:party_roles!buyer_party_id(profile_id), seller:party_roles!seller_party_id(profile_id)'
      )
      .eq('id', transaction.source_id)
      .single()
    const row = offer as unknown as {
      buyer: { profile_id: string } | null
      seller: { profile_id: string } | null
    } | null
    if (row?.buyer?.profile_id) profileIds.push(row.buyer.profile_id)
    if (row?.seller?.profile_id) profileIds.push(row.seller.profile_id)
  } else {
    const { data: application } = await admin
      .from('rental_applications')
      .select(
        'applicant:party_roles!applicant_party_id(profile_id), listings(listed_by)'
      )
      .eq('id', transaction.source_id)
      .single()
    const row = application as unknown as {
      applicant: { profile_id: string } | null
      listings: { listed_by: string } | null
    } | null
    if (row?.applicant?.profile_id) profileIds.push(row.applicant.profile_id)
    if (row?.listings?.listed_by) profileIds.push(row.listings.listed_by)
  }

  await Promise.all(
    profileIds.map((profileId) =>
      createNotification({
        profileId,
        type: notification.type,
        title: notification.title,
        linkHref: `/dashboard/transactions/${transactionId}`,
      })
    )
  )
}

export async function recordDisputeOpened(input: {
  providerPaymentIntentId: string
  providerDisputeId: string
  reason?: string
}): Promise<void> {
  const admin = createAdminClient()

  const { data: intentRow } = await admin
    .from('payment_intents')
    .select('id, transaction_id')
    .eq('provider_intent_id', input.providerPaymentIntentId)
    .maybeSingle()

  if (!intentRow) return

  const { data: paymentRow } = await admin
    .from('payments')
    .select('id')
    .eq('payment_intent_id', intentRow.id)
    .maybeSingle()

  if (!paymentRow) return

  await admin.from('disputes').insert({
    payment_id: paymentRow.id,
    provider_dispute_id: input.providerDisputeId,
    reason: input.reason ?? null,
    status: 'open',
  })

  // Dispute status only — never mutates contract_status/transaction status.
  await admin
    .from('transactions')
    .update({ dispute_status: 'open' })
    .eq('id', intentRow.transaction_id)
}
