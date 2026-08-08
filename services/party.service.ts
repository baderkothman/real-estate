import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { ListingType, PartyRoleSummary, PartyRoleType } from '@/types'

// `party_roles` has no INSERT/UPDATE/DELETE policy for authenticated/anon —
// see supabase/migrations/006_party_roles_audit_events.sql — so every write
// here goes through the service-role admin client. Reads use the
// request-scoped client so RLS naturally scopes a profile to their own
// roles (or an admin to everyone's).

/**
 * Summarizes a profile's active party roles across all listings, grouped by
 * role type — e.g. "Seller on 3 listings, Landlord on 1 listing". Roles are
 * scoped per-listing, not to the account globally, so the same profile can
 * appear as both a seller (on one listing) and, once offers/applications
 * exist, a buyer (on another) — this summary reflects whatever the account
 * actually holds today, not a single fixed label.
 */
export async function getPartyRoleSummaryForProfile(
  profileId: string
): Promise<PartyRoleSummary[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('party_roles')
    .select('role')
    .eq('profile_id', profileId)
    .eq('status', 'active')

  if (error || !data) return []

  const counts = new Map<PartyRoleType, number>()
  for (const row of data as { role: PartyRoleType }[]) {
    counts.set(row.role, (counts.get(row.role) ?? 0) + 1)
  }

  return Array.from(counts.entries()).map(([role, count]) => ({
    role,
    count,
  }))
}

/**
 * Ensures the listing's creator has the appropriate owner-side party role
 * (seller for sale listings, landlord for rent listings) attached to that
 * listing. Idempotent — safe to call more than once for the same listing.
 * Called from `createProperty` in services/listing.service.ts so every new
 * listing gets this row automatically, matching the backfill migration 010
 * ran for pre-existing listings.
 */
export async function ensureOwnerPartyRole(
  listingId: string,
  profileId: string,
  listingType: ListingType
): Promise<void> {
  const admin = createAdminClient()
  const role: PartyRoleType = listingType === 'rent' ? 'landlord' : 'seller'

  const { data: existing } = await admin
    .from('party_roles')
    .select('id')
    .eq('listing_id', listingId)
    .eq('profile_id', profileId)
    .eq('role', role)
    .maybeSingle()

  if (existing) return

  const { error } = await admin.from('party_roles').insert({
    profile_id: profileId,
    role,
    listing_id: listingId,
    status: 'active',
  })

  if (error) {
    // Non-fatal: the listing itself was already created successfully.
    // Missing the party_roles row only affects the dashboard's role
    // summary, not any authorization decision, so this must not block
    // listing creation from completing.
    console.error('Failed to create owner party role:', error, {
      listingId,
      profileId,
      role,
    })
  }
}
