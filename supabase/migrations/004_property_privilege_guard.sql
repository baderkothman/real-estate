-- P0 hotfix: close a privilege-escalation gap in the `properties_update` RLS
-- policy. That policy allows any owner (`user_id = auth.uid()`) to update
-- their own row — but RLS's `USING` clause does not restrict *which columns*
-- can change. Today the only thing stopping a non-admin from setting
-- `status = 'approved'` or `is_featured = true` on their own listing via a
-- direct PostgREST call (anon key + their JWT) is the Server Action's
-- app-layer `sanitizePropertyInput()` in app/actions/properties.ts — which a
-- direct API call bypasses entirely.
--
-- This adds a BEFORE UPDATE trigger that rejects any non-admin attempt to
-- change `status`, `is_featured`, `featured_until`, or `user_id`, enforced
-- inside the database itself. `is_sold`/`sold_at` are intentionally excluded
-- — toggling sold status is a legitimate owner-only action today.
--
-- Shipped standalone, ahead of the properties/listings schema split, so the
-- hole is closed immediately regardless of when the larger migration lands.

create or replace function public.enforce_properties_privilege_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    if new.status is distinct from old.status
      or new.is_featured is distinct from old.is_featured
      or new.featured_until is distinct from old.featured_until
      or new.user_id is distinct from old.user_id
    then
      raise exception 'Only admins may change status, is_featured, featured_until, or user_id on properties'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_properties_privilege_guard on public.properties;

create trigger trg_properties_privilege_guard
  before update on public.properties
  for each row execute procedure public.enforce_properties_privilege_guard();
