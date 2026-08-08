import { createClient } from '@/lib/neon/server'

/**
 * Generic region_code/rule_key/rule_value config, seeded with Lebanon (LB)
 * defaults only (dbClient/migrations/016_payments_ledger_commission.sql).
 * Every seeded value is a conservative placeholder marked for legal review —
 * reading a rule here is not a compliance claim. No other region is
 * modeled; this app targets Lebanon only.
 */
export async function getRegionalRule<T = unknown>(
  ruleKey: string,
  regionCode = 'LB'
): Promise<T | null> {
  const dbClient = await createClient()
  const { data, error } = await dbClient
    .from('regional_rules')
    .select('rule_value')
    .eq('region_code', regionCode)
    .eq('rule_key', ruleKey)
    .maybeSingle()

  if (error || !data) return null
  return data.rule_value as T
}
