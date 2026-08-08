-- Milestone 6: offers (with immutable revision history), rental
-- applications (a separate workflow — not a generic "request" object), and
-- a `transactions` shell created automatically when an offer is accepted or
-- an application is approved. The full transaction workspace UI lands in
-- Milestone 7; this migration only creates the row and the minimal fields
-- needed to track it (contract/payment/payout/dispute status are
-- independent from day one, per the "never derive contract state from
-- payment state" constraint — nothing populates payment/payout/dispute yet,
-- that's Milestone 8).

-- ─── Shared helper: idempotent party role creation ─────────────────────────
create or replace function public.ensure_party_role(
  p_profile_id uuid, p_role party_role_type, p_listing_id uuid
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  select id into v_id from public.party_roles
  where profile_id = p_profile_id and role = p_role and listing_id = p_listing_id;

  if v_id is not null then
    return v_id;
  end if;

  insert into public.party_roles (profile_id, role, listing_id, status)
  values (p_profile_id, p_role, p_listing_id, 'active')
  returning id into v_id;

  return v_id;
end;
$$;

-- ─── Offers ──────────────────────────────────────────────────────────────────
create type offer_status as enum (
  'submitted', 'countered', 'accepted', 'rejected', 'withdrawn', 'expired'
);

create table public.offers (
  id                  uuid primary key default uuid_generate_v4(),
  listing_id          uuid not null references public.listings(id) on delete cascade,
  buyer_party_id      uuid not null references public.party_roles(id),
  seller_party_id     uuid not null references public.party_roles(id),
  status              offer_status not null default 'submitted',
  current_revision_id uuid,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Append-only: a counter is a new row, never a mutated one. See "never
-- overwrite historical offers" in the project constraints.
create table public.offer_revisions (
  id              uuid primary key default uuid_generate_v4(),
  offer_id        uuid not null references public.offers(id) on delete cascade,
  revision_number int not null,
  proposed_by     uuid not null references public.profiles(id),
  price           numeric(15, 2) not null,
  contingencies   jsonb not null default '{}',
  closing_date    date,
  expires_at      timestamptz,
  message         text,
  created_at      timestamptz not null default now(),
  unique (offer_id, revision_number)
);

alter table public.offers
  add constraint offers_current_revision_fkey
  foreign key (current_revision_id) references public.offer_revisions(id);

create index idx_offers_listing_id      on public.offers(listing_id);
create index idx_offers_buyer_party_id  on public.offers(buyer_party_id);
create index idx_offers_seller_party_id on public.offers(seller_party_id);
create index idx_offer_revisions_offer  on public.offer_revisions(offer_id, revision_number);

create trigger trg_offers_set_updated_at
  before update on public.offers
  for each row execute procedure public.set_updated_at();

alter table public.offers enable row level security;
alter table public.offer_revisions enable row level security;

create or replace function public.is_offer_party(p_offer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.offers o
    join public.party_roles pr on pr.id in (o.buyer_party_id, o.seller_party_id)
    where o.id = p_offer_id and pr.profile_id = auth.uid()
  );
$$;

create policy "offers_select"
  on public.offers for select
  using (public.is_offer_party(id) or public.is_admin());

-- No INSERT policy: offers are only created via `submit_offer` below
-- (SECURITY DEFINER — the buyer-owns-the-party-role and listing-eligibility
-- checks are manual, not RLS-expressible in one clause).
create policy "offers_update"
  on public.offers for update
  using (public.is_offer_party(id) or public.is_admin());

create policy "offer_revisions_select"
  on public.offer_revisions for select
  using (public.is_offer_party(offer_id) or public.is_admin());

-- ─── Offer transition graph ──────────────────────────────────────────────────
-- submitted/countered -> accepted|rejected|withdrawn|expired; submitted ->
-- countered. A fresh counter-round keeps status='countered' (only
-- current_revision_id changes) — handled by `counter_offer` below, not a
-- status transition captured in this table.
create or replace function public.is_valid_offer_transition(
  p_old offer_status, p_new offer_status
) returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_old = p_new or (p_old, p_new) in (
    ('submitted', 'countered'),
    ('submitted', 'accepted'),
    ('submitted', 'rejected'),
    ('submitted', 'withdrawn'),
    ('submitted', 'expired'),
    ('countered', 'accepted'),
    ('countered', 'rejected'),
    ('countered', 'withdrawn'),
    ('countered', 'expired')
  );
$$;

create or replace function public.enforce_offer_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_last_proposer  uuid;
  v_buyer_profile  uuid;
  v_seller_profile uuid;
begin
  if new.listing_id is distinct from old.listing_id
    or new.buyer_party_id is distinct from old.buyer_party_id
    or new.seller_party_id is distinct from old.seller_party_id
  then
    raise exception 'listing_id, buyer_party_id, and seller_party_id cannot be changed'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if not public.is_valid_offer_transition(old.status, new.status) then
      raise exception 'Invalid offer status transition: % -> %', old.status, new.status
        using errcode = '22023';
    end if;

    select profile_id into v_buyer_profile from public.party_roles where id = old.buyer_party_id;
    select profile_id into v_seller_profile from public.party_roles where id = old.seller_party_id;
    select proposed_by into v_last_proposer from public.offer_revisions where id = old.current_revision_id;

    if new.status in ('accepted', 'rejected') then
      if public.is_admin() then
        null;
      elsif auth.uid() = v_last_proposer then
        raise exception 'Only the party who did not propose the current terms may accept or reject them'
          using errcode = '42501';
      elsif auth.uid() <> v_buyer_profile and auth.uid() <> v_seller_profile then
        raise exception 'Not a party to this offer' using errcode = '42501';
      end if;
    elsif new.status = 'withdrawn' then
      if not (auth.uid() = v_buyer_profile or auth.uid() = v_seller_profile or public.is_admin()) then
        raise exception 'Not a party to this offer' using errcode = '42501';
      end if;
    elsif new.status = 'expired' and not public.is_admin() then
      raise exception 'Only an admin/system process may expire an offer'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_offers_transition
  before update on public.offers
  for each row execute procedure public.enforce_offer_transition();

-- ─── submit_offer / counter_offer / accept_offer ────────────────────────────
-- SECURITY DEFINER: each performs checks that aren't expressible as a
-- single RLS clause (listing eligibility, "not your own listing", "not the
-- last proposer"), then relies on the guard trigger above for the actual
-- status-transition authorization on any UPDATE it performs — the trigger
-- fires regardless of the calling function's security context, so
-- authorization is not duplicated, only the listing/party setup is.
create or replace function public.submit_offer(
  p_listing_id uuid,
  p_price numeric,
  p_contingencies jsonb,
  p_closing_date date,
  p_expires_at timestamptz,
  p_message text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id       uuid;
  v_listing_type   public.listing_type;
  v_moderation     public.listing_moderation_status;
  v_lifecycle      public.listing_lifecycle_status;
  v_buyer_party_id uuid;
  v_seller_party_id uuid;
  v_offer_id       uuid;
  v_revision_id    uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select listed_by, listing_type, moderation_status, lifecycle_status
    into v_owner_id, v_listing_type, v_moderation, v_lifecycle
  from public.listings
  where id = p_listing_id;

  if v_owner_id is null then
    raise exception 'Listing not found' using errcode = 'P0002';
  end if;
  if v_listing_type <> 'sale' then
    raise exception 'Offers only apply to sale listings — use a rental application instead'
      using errcode = '22023';
  end if;
  if v_owner_id = auth.uid() then
    raise exception 'You cannot make an offer on your own listing' using errcode = '42501';
  end if;
  if v_moderation <> 'approved' or v_lifecycle not in ('available', 'under_offer') then
    raise exception 'This listing is not currently accepting offers' using errcode = '22023';
  end if;

  v_buyer_party_id := public.ensure_party_role(auth.uid(), 'buyer', p_listing_id);
  v_seller_party_id := public.ensure_party_role(v_owner_id, 'seller', p_listing_id);

  insert into public.offers (listing_id, buyer_party_id, seller_party_id, status)
  values (p_listing_id, v_buyer_party_id, v_seller_party_id, 'submitted')
  returning id into v_offer_id;

  insert into public.offer_revisions (offer_id, revision_number, proposed_by, price, contingencies, closing_date, expires_at, message)
  values (v_offer_id, 1, auth.uid(), p_price, coalesce(p_contingencies, '{}'), p_closing_date, p_expires_at, p_message)
  returning id into v_revision_id;

  update public.offers set current_revision_id = v_revision_id where id = v_offer_id;

  if v_lifecycle = 'available' then
    update public.listings set lifecycle_status = 'under_offer' where id = p_listing_id;
  end if;

  return v_offer_id;
end;
$$;

create or replace function public.counter_offer(
  p_offer_id uuid,
  p_price numeric,
  p_contingencies jsonb,
  p_closing_date date,
  p_expires_at timestamptz,
  p_message text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status          public.offer_status;
  v_buyer_profile   uuid;
  v_seller_profile  uuid;
  v_last_proposer   uuid;
  v_next_revision   int;
  v_revision_id     uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select o.status, pr_b.profile_id, pr_s.profile_id, rev.proposed_by, coalesce(max(all_rev.revision_number), 0)
    into v_status, v_buyer_profile, v_seller_profile, v_last_proposer, v_next_revision
  from public.offers o
  join public.party_roles pr_b on pr_b.id = o.buyer_party_id
  join public.party_roles pr_s on pr_s.id = o.seller_party_id
  left join public.offer_revisions rev on rev.id = o.current_revision_id
  left join public.offer_revisions all_rev on all_rev.offer_id = o.id
  where o.id = p_offer_id
  group by o.status, pr_b.profile_id, pr_s.profile_id, rev.proposed_by;

  if v_status is null then
    raise exception 'Offer not found' using errcode = 'P0002';
  end if;
  if v_status not in ('submitted', 'countered') then
    raise exception 'This offer is no longer open for negotiation' using errcode = '22023';
  end if;
  if auth.uid() <> v_buyer_profile and auth.uid() <> v_seller_profile then
    raise exception 'Not a party to this offer' using errcode = '42501';
  end if;
  if auth.uid() = v_last_proposer then
    raise exception 'You already proposed the current terms — wait for a response'
      using errcode = '42501';
  end if;

  insert into public.offer_revisions (offer_id, revision_number, proposed_by, price, contingencies, closing_date, expires_at, message)
  values (p_offer_id, v_next_revision + 1, auth.uid(), p_price, coalesce(p_contingencies, '{}'), p_closing_date, p_expires_at, p_message)
  returning id into v_revision_id;

  update public.offers set current_revision_id = v_revision_id, status = 'countered' where id = p_offer_id;

  return v_revision_id;
end;
$$;

create or replace function public.accept_offer(p_offer_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing_id uuid;
  v_transaction_id uuid;
begin
  select listing_id into v_listing_id from public.offers where id = p_offer_id;
  if v_listing_id is null then
    raise exception 'Offer not found' using errcode = 'P0002';
  end if;

  -- The guard trigger validates the transition and who may perform it; it
  -- fires regardless of this function's SECURITY DEFINER context.
  update public.offers set status = 'accepted' where id = p_offer_id;

  update public.listings set lifecycle_status = 'under_contract' where id = v_listing_id;

  insert into public.transactions (listing_id, source_type, source_id)
  values (v_listing_id, 'offer', p_offer_id)
  returning id into v_transaction_id;

  return v_transaction_id;
end;
$$;

grant execute on function public.submit_offer(uuid, numeric, jsonb, date, timestamptz, text) to authenticated;
grant execute on function public.counter_offer(uuid, numeric, jsonb, date, timestamptz, text) to authenticated;
grant execute on function public.accept_offer(uuid) to authenticated;

-- ─── Rental applications ─────────────────────────────────────────────────────
create type rental_application_status as enum (
  'submitted', 'under_review', 'approved', 'conditionally_approved', 'rejected', 'withdrawn'
);

create table public.rental_applications (
  id                 uuid primary key default uuid_generate_v4(),
  listing_id         uuid not null references public.listings(id) on delete cascade,
  applicant_party_id uuid not null references public.party_roles(id),
  status             rental_application_status not null default 'submitted',
  monthly_income     numeric(15, 2),
  employment_note    text,
  occupants_count    smallint,
  has_pets           boolean not null default false,
  move_in_date       date,
  -- Explicit stub fields, not a real integration — see project constraints
  -- on not fabricating background/credit screening.
  screening_status   text not null default 'not_requested'
                        check (screening_status in ('not_requested', 'pending', 'stub_pass', 'stub_fail')),
  screening_provider text,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index idx_rental_applications_listing_id   on public.rental_applications(listing_id);
create index idx_rental_applications_applicant_id on public.rental_applications(applicant_party_id);

create trigger trg_rental_applications_set_updated_at
  before update on public.rental_applications
  for each row execute procedure public.set_updated_at();

alter table public.rental_applications enable row level security;

create or replace function public.is_rental_application_party(p_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.rental_applications ra
    join public.party_roles pr on pr.id = ra.applicant_party_id
    where ra.id = p_application_id and pr.profile_id = auth.uid()
  )
  or exists (
    select 1 from public.rental_applications ra
    join public.listings l on l.id = ra.listing_id
    where ra.id = p_application_id and l.listed_by = auth.uid()
  );
$$;

create policy "rental_applications_select"
  on public.rental_applications for select
  using (public.is_rental_application_party(id) or public.is_admin());

-- No INSERT policy — created only via `submit_rental_application` below.
create policy "rental_applications_update"
  on public.rental_applications for update
  using (public.is_rental_application_party(id) or public.is_admin());

create or replace function public.is_valid_application_transition(
  p_old rental_application_status, p_new rental_application_status
) returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_old = p_new or (p_old, p_new) in (
    ('submitted', 'under_review'),
    ('submitted', 'approved'),
    ('submitted', 'conditionally_approved'),
    ('submitted', 'rejected'),
    ('submitted', 'withdrawn'),
    ('under_review', 'approved'),
    ('under_review', 'conditionally_approved'),
    ('under_review', 'rejected'),
    ('under_review', 'withdrawn')
  );
$$;

create or replace function public.enforce_application_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id     uuid;
  v_applicant_id uuid;
begin
  if new.listing_id is distinct from old.listing_id
    or new.applicant_party_id is distinct from old.applicant_party_id
  then
    raise exception 'listing_id and applicant_party_id cannot be changed'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if not public.is_valid_application_transition(old.status, new.status) then
      raise exception 'Invalid application status transition: % -> %', old.status, new.status
        using errcode = '22023';
    end if;

    select l.listed_by into v_owner_id from public.listings l where l.id = old.listing_id;
    select profile_id into v_applicant_id from public.party_roles where id = old.applicant_party_id;

    if new.status = 'withdrawn' then
      if not (auth.uid() = v_applicant_id or public.is_admin()) then
        raise exception 'Only the applicant may withdraw an application' using errcode = '42501';
      end if;
    elsif new.status in ('under_review', 'approved', 'conditionally_approved', 'rejected') then
      if not (auth.uid() = v_owner_id or public.is_admin()) then
        raise exception 'Only the listing owner may review this application' using errcode = '42501';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_applications_transition
  before update on public.rental_applications
  for each row execute procedure public.enforce_application_transition();

create or replace function public.submit_rental_application(
  p_listing_id uuid,
  p_monthly_income numeric,
  p_employment_note text,
  p_occupants_count smallint,
  p_has_pets boolean,
  p_move_in_date date,
  p_notes text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id     uuid;
  v_listing_type public.listing_type;
  v_moderation   public.listing_moderation_status;
  v_lifecycle    public.listing_lifecycle_status;
  v_applicant_id uuid;
  v_application_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select listed_by, listing_type, moderation_status, lifecycle_status
    into v_owner_id, v_listing_type, v_moderation, v_lifecycle
  from public.listings
  where id = p_listing_id;

  if v_owner_id is null then
    raise exception 'Listing not found' using errcode = 'P0002';
  end if;
  if v_listing_type <> 'rent' then
    raise exception 'Rental applications only apply to rental listings — use an offer instead'
      using errcode = '22023';
  end if;
  if v_owner_id = auth.uid() then
    raise exception 'You cannot apply to rent your own listing' using errcode = '42501';
  end if;
  if v_moderation <> 'approved' or v_lifecycle not in ('available', 'under_offer') then
    raise exception 'This listing is not currently accepting applications' using errcode = '22023';
  end if;

  v_applicant_id := public.ensure_party_role(auth.uid(), 'tenant', p_listing_id);

  insert into public.rental_applications (
    listing_id, applicant_party_id, monthly_income, employment_note,
    occupants_count, has_pets, move_in_date, notes
  )
  values (
    p_listing_id, v_applicant_id, p_monthly_income, p_employment_note,
    p_occupants_count, p_has_pets, p_move_in_date, p_notes
  )
  returning id into v_application_id;

  if v_lifecycle = 'available' then
    update public.listings set lifecycle_status = 'under_offer' where id = p_listing_id;
  end if;

  return v_application_id;
end;
$$;

create or replace function public.approve_rental_application(p_application_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing_id uuid;
  v_transaction_id uuid;
begin
  select listing_id into v_listing_id from public.rental_applications where id = p_application_id;
  if v_listing_id is null then
    raise exception 'Application not found' using errcode = 'P0002';
  end if;

  update public.rental_applications set status = 'approved' where id = p_application_id;

  update public.listings set lifecycle_status = 'under_contract' where id = v_listing_id;

  insert into public.transactions (listing_id, source_type, source_id)
  values (v_listing_id, 'rental_application', p_application_id)
  returning id into v_transaction_id;

  return v_transaction_id;
end;
$$;

grant execute on function public.submit_rental_application(uuid, numeric, text, smallint, boolean, date, text) to authenticated;
grant execute on function public.approve_rental_application(uuid) to authenticated;

-- ─── Transactions (shell — full workspace lands in Milestone 7) ────────────
create type transaction_status as enum (
  'active', 'pending_closing', 'completed', 'cancelled', 'terminated'
);

create table public.transactions (
  id                 uuid primary key default uuid_generate_v4(),
  listing_id         uuid not null references public.listings(id) on delete cascade,
  source_type        text not null check (source_type in ('offer', 'rental_application')),
  -- Polymorphic reference (offers.id or rental_applications.id) — no FK
  -- since it targets one of two tables; validated in application code and
  -- by the fact both creation paths above are the only writers.
  source_id          uuid not null,
  status             transaction_status not null default 'active',
  -- Independently-updatable, per the "never derive contract state from
  -- payment state" constraint. Nothing sets these beyond 'not_started'/
  -- 'none' until Milestone 8.
  contract_status    text not null default 'not_started'
                        check (contract_status in ('not_started', 'drafted', 'sent', 'partially_signed', 'fully_signed')),
  payment_status     text not null default 'not_started'
                        check (payment_status in ('not_started', 'pending', 'partial', 'held', 'released', 'refunded')),
  payout_status      text not null default 'not_started'
                        check (payout_status in ('not_started', 'pending', 'completed', 'failed')),
  dispute_status     text not null default 'none'
                        check (dispute_status in ('none', 'open', 'resolved')),
  target_close_date  date,
  closed_at          timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index idx_transactions_listing_id on public.transactions(listing_id);
create index idx_transactions_source     on public.transactions(source_type, source_id);

create trigger trg_transactions_set_updated_at
  before update on public.transactions
  for each row execute procedure public.set_updated_at();

alter table public.transactions enable row level security;

create or replace function public.is_transaction_party(p_transaction_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_listing_id  uuid;
  v_source_type text;
  v_source_id   uuid;
begin
  select listing_id, source_type, source_id
    into v_listing_id, v_source_type, v_source_id
  from public.transactions
  where id = p_transaction_id;

  if v_listing_id is null then
    return false;
  end if;

  if exists (select 1 from public.listings l where l.id = v_listing_id and l.listed_by = auth.uid()) then
    return true;
  end if;

  if v_source_type = 'offer' then
    return public.is_offer_party(v_source_id);
  end if;

  return public.is_rental_application_party(v_source_id);
end;
$$;

create policy "transactions_select"
  on public.transactions for select
  using (public.is_transaction_party(id) or public.is_admin());

-- No general write policy: transactions are created only by `accept_offer`
-- / `approve_rental_application` above; status-field updates land in
-- Milestone 7 with their own transition guard.
