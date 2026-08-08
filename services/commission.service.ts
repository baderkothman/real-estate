import { createAdminClient } from '@/lib/neon/admin'

interface CommissionConfigRow {
  rate_percent: number | null
  flat_fee: number | null
}

/**
 * Reads the current platform-default commission config. Agent-specific
 * overrides are schema-ready (`commission_configs.scope = 'agent_override'`)
 * but not selected here — no UI exists yet to manage per-agent rates, so
 * every transaction uses the platform default for now.
 *
 * Uses the admin client because `commission_configs` is admin-only by RLS
 * (it's internal financial configuration) — a buyer completing a deposit
 * still needs the commission calculated even though they can't read the
 * config table directly.
 */
export async function getPlatformCommissionConfig(): Promise<CommissionConfigRow | null> {
  const admin = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await admin
    .from('commission_configs')
    .select('rate_percent, flat_fee')
    .eq('scope', 'platform_default')
    .lte('effective_from', today)
    .or(`effective_to.is.null,effective_to.gte.${today}`)
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return data as CommissionConfigRow
}

/**
 * Computes and permanently stores the commission for a transaction, once.
 * The applied rate/amount are copied onto `transactions` rather than
 * recomputed on read, so a later change to `commission_configs` cannot
 * retroactively change what an already-in-progress transaction owes — see
 * the project's "never let historical financial truth be recalculated from
 * current config" constraint.
 */
export async function applyCommissionToTransaction(
  transactionId: string,
  dealAmount: number
): Promise<{ ratePercent: number | null; amount: number } | null> {
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('transactions')
    .select('commission_amount')
    .eq('id', transactionId)
    .single()

  if (
    existing?.commission_amount !== null &&
    existing?.commission_amount !== undefined
  ) {
    return null // already applied — never recompute
  }

  const config = await getPlatformCommissionConfig()
  if (!config) return null

  const ratePercent = config.rate_percent ?? 0
  const flatFee = config.flat_fee ?? 0
  const amount = Number(((dealAmount * ratePercent) / 100 + flatFee).toFixed(2))

  const { error } = await admin
    .from('transactions')
    .update({ commission_rate_percent: ratePercent, commission_amount: amount })
    .eq('id', transactionId)

  if (error) throw new Error(error.message)
  return { ratePercent, amount }
}
