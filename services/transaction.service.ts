import { createClient } from '@/lib/supabase/server'

export type TransactionStatus =
  | 'active'
  | 'pending_closing'
  | 'completed'
  | 'cancelled'
  | 'terminated'
export type ContractStatus =
  | 'not_started'
  | 'drafted'
  | 'sent'
  | 'partially_signed'
  | 'fully_signed'
export type PaymentStatus =
  | 'not_started'
  | 'pending'
  | 'partial'
  | 'held'
  | 'released'
  | 'refunded'
export type PayoutStatus = 'not_started' | 'pending' | 'completed' | 'failed'
export type DisputeStatus = 'none' | 'open' | 'resolved'

export interface Transaction {
  id: string
  listingId: string
  sourceType: 'offer' | 'rental_application'
  sourceId: string
  status: TransactionStatus
  contractStatus: ContractStatus
  paymentStatus: PaymentStatus
  payoutStatus: PayoutStatus
  disputeStatus: DisputeStatus
  targetCloseDate?: string
  closedAt?: Date
  createdAt: Date
  listingTitle?: string
  listingCity?: string
  commissionRatePercent?: number
  commissionAmount?: number
}

interface TransactionRow {
  id: string
  listing_id: string
  source_type: 'offer' | 'rental_application'
  source_id: string
  status: TransactionStatus
  contract_status: ContractStatus
  payment_status: PaymentStatus
  payout_status: PayoutStatus
  dispute_status: DisputeStatus
  target_close_date: string | null
  closed_at: string | null
  created_at: string
  commission_rate_percent: number | null
  commission_amount: number | null
  listings: { title: string; properties: { city: string } | null } | null
}

const TRANSACTION_SELECT = '*, listings(title, properties(city))'

function dbRowToTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    listingId: row.listing_id,
    sourceType: row.source_type,
    sourceId: row.source_id,
    status: row.status,
    contractStatus: row.contract_status,
    paymentStatus: row.payment_status,
    payoutStatus: row.payout_status,
    disputeStatus: row.dispute_status,
    targetCloseDate: row.target_close_date ?? undefined,
    closedAt: row.closed_at ? new Date(row.closed_at) : undefined,
    createdAt: new Date(row.created_at),
    listingTitle: row.listings?.title,
    listingCity: row.listings?.properties?.city,
    commissionRatePercent: row.commission_rate_percent ?? undefined,
    commissionAmount: row.commission_amount ?? undefined,
  }
}

export async function getTransactionById(
  id: string
): Promise<Transaction | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('transactions')
    .select(TRANSACTION_SELECT)
    .eq('id', id)
    .single()

  if (error || !data) return null
  return dbRowToTransaction(data as unknown as TransactionRow)
}

/**
 * RLS (`is_transaction_party`) already scopes visibility to the listing
 * owner and the offer/application's parties. Looks up the transaction shell
 * created by `accept_offer`/`approve_rental_application` so an offer or
 * application card can link straight to it.
 */
export async function getTransactionBySource(
  sourceType: 'offer' | 'rental_application',
  sourceId: string
): Promise<Transaction | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('transactions')
    .select(TRANSACTION_SELECT)
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)
    .maybeSingle()

  if (error || !data) return null
  return dbRowToTransaction(data as unknown as TransactionRow)
}

/**
 * Moves the transaction to a new overall status. The DB-enforced guard
 * trigger (migration 014) validates both the transition graph and that the
 * caller is a party to the transaction — including the rule that
 * `pending_closing` cannot be reached until the contract is fully signed
 * and payment is held/partial, which is genuinely unreachable until
 * Milestone 8 ships documents/payments.
 */
export async function transitionTransactionStatus(
  id: string,
  status: TransactionStatus
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('transactions')
    .update({ status })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export interface TransactionParticipant {
  profileId: string
  name?: string
  image?: string
  role: string
}

interface PartyProfileJoin {
  profile_id: string
  profiles: { name: string; profile_image: string | null } | null
}

/**
 * Participants are derived from the transaction's source (offer or rental
 * application) rather than a dedicated schema addition — the buyer/seller
 * or applicant/landlord relationship already lives on those rows.
 */
export async function getTransactionParticipants(
  transaction: Transaction
): Promise<TransactionParticipant[]> {
  const supabase = await createClient()

  if (transaction.sourceType === 'offer') {
    const { data } = await supabase
      .from('offers')
      .select(
        'buyer:party_roles!buyer_party_id(profile_id, profiles(name, profile_image)), seller:party_roles!seller_party_id(profile_id, profiles(name, profile_image))'
      )
      .eq('id', transaction.sourceId)
      .single()

    const row = data as unknown as {
      buyer: PartyProfileJoin | null
      seller: PartyProfileJoin | null
    } | null

    const participants: TransactionParticipant[] = []
    if (row?.buyer) {
      participants.push({
        profileId: row.buyer.profile_id,
        name: row.buyer.profiles?.name,
        image: row.buyer.profiles?.profile_image ?? undefined,
        role: 'Buyer',
      })
    }
    if (row?.seller) {
      participants.push({
        profileId: row.seller.profile_id,
        name: row.seller.profiles?.name,
        image: row.seller.profiles?.profile_image ?? undefined,
        role: 'Seller',
      })
    }
    return participants
  }

  const { data } = await supabase
    .from('rental_applications')
    .select(
      'applicant:party_roles!applicant_party_id(profile_id, profiles(name, profile_image)), listings(listed_by, owner:profiles!listed_by(name, profile_image))'
    )
    .eq('id', transaction.sourceId)
    .single()

  const row = data as unknown as {
    applicant: PartyProfileJoin | null
    listings: {
      listed_by: string
      owner: { name: string; profile_image: string | null } | null
    } | null
  } | null

  const participants: TransactionParticipant[] = []
  if (row?.listings) {
    participants.push({
      profileId: row.listings.listed_by,
      name: row.listings.owner?.name,
      image: row.listings.owner?.profile_image ?? undefined,
      role: 'Landlord',
    })
  }
  if (row?.applicant) {
    participants.push({
      profileId: row.applicant.profile_id,
      name: row.applicant.profiles?.name,
      image: row.applicant.profiles?.profile_image ?? undefined,
      role: 'Tenant',
    })
  }
  return participants
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export type TaskStatus = 'open' | 'in_progress' | 'done' | 'skipped'

export interface TransactionTask {
  id: string
  transactionId: string
  title: string
  status: TaskStatus
  dueDate?: string
  assignedPartyId?: string
  orderIndex: number
  createdAt: Date
}

interface TaskRow {
  id: string
  transaction_id: string
  title: string
  status: TaskStatus
  due_date: string | null
  assigned_party_id: string | null
  order_index: number
  created_at: string
}

function dbRowToTask(row: TaskRow): TransactionTask {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    title: row.title,
    status: row.status,
    dueDate: row.due_date ?? undefined,
    assignedPartyId: row.assigned_party_id ?? undefined,
    orderIndex: row.order_index,
    createdAt: new Date(row.created_at),
  }
}

export async function getTransactionTasks(
  transactionId: string
): Promise<TransactionTask[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('transaction_tasks')
    .select('*')
    .eq('transaction_id', transactionId)
    .order('order_index', { ascending: true })

  if (error || !data) return []
  return (data as TaskRow[]).map(dbRowToTask)
}

export async function createTransactionTask(input: {
  transactionId: string
  title: string
  dueDate?: string
}): Promise<void> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('transaction_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('transaction_id', input.transactionId)

  const { error } = await supabase.from('transaction_tasks').insert({
    transaction_id: input.transactionId,
    title: input.title,
    due_date: input.dueDate ?? null,
    order_index: count ?? 0,
  })
  if (error) throw new Error(error.message)
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('transaction_tasks')
    .update({ status })
    .eq('id', taskId)
  if (error) throw new Error(error.message)
}
