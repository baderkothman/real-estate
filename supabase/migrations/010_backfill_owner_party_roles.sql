-- Milestone 4: gives every existing listing owner an explicit party_roles
-- row (seller for sale listings, landlord for rent listings), so the
-- dashboard's "Your Roles" summary has real data from day one instead of
-- only reflecting listings created after this migration. Going forward,
-- new listings get this row automatically at creation time — see
-- `ensureOwnerPartyRole` in services/party.service.ts, called from
-- `createProperty` in services/listing.service.ts.
--
-- This is the first migration to actually write data into `party_roles`
-- (created empty in migration 006), so there is no pre-existing-duplicate
-- risk here — the unique index below is a forward-looking safety net
-- against `ensureOwnerPartyRole` (or any future caller) accidentally
-- inserting the same role twice for the same listing.

create unique index uq_party_roles_profile_role_listing
  on public.party_roles(profile_id, role, listing_id);

insert into public.party_roles (profile_id, role, listing_id, status)
select
  listed_by,
  case
    when listing_type = 'rent' then 'landlord'::party_role_type
    else 'seller'::party_role_type
  end,
  id,
  'active'
from public.listings;
