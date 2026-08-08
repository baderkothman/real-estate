-- Milestone 7: the transaction status machine and `transaction_tasks`,
-- completing the workspace `transactions` shell created in Milestone 6.
-- Participants are derived from the transaction's source (offer or rental
-- application) rather than a new schema addition — the buyer/seller or
-- applicant/landlord relationship already exists on those rows.

-- ─── Transaction transition graph ───────────────────────────────────────────
-- active -> pending_closing requires contract_status = 'fully_signed' and
-- payment_status in ('held','partial') — genuinely unreachable until
-- Milestone 8 ships documents/e-signature/payments. That's intentional: the
-- workspace should not claim a deal is ready to close when nothing has
-- verified a signed contract or received funds. Admins may override for
-- support purposes.
create or replace function public.is_valid_transaction_transition(
  p_old transaction_status, p_new transaction_status
) returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_old = p_new or (p_old, p_new) in (
    ('active', 'pending_closing'),
    ('active', 'cancelled'),
    ('active', 'terminated'),
    ('pending_closing', 'active'),
    ('pending_closing', 'completed'),
    ('pending_closing', 'cancelled'),
    ('pending_closing', 'terminated')
  );
$$;

create or replace function public.enforce_transaction_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.listing_id is distinct from old.listing_id
    or new.source_type is distinct from old.source_type
    or new.source_id is distinct from old.source_id
  then
    raise exception 'listing_id, source_type, and source_id cannot be changed'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if not public.is_valid_transaction_transition(old.status, new.status) then
      raise exception 'Invalid transaction status transition: % -> %', old.status, new.status
        using errcode = '22023';
    end if;

    if not (public.is_transaction_party(old.id) or public.is_admin()) then
      raise exception 'Not a party to this transaction' using errcode = '42501';
    end if;

    if new.status = 'pending_closing' and not public.is_admin() then
      if old.contract_status <> 'fully_signed' or old.payment_status not in ('held', 'partial') then
        raise exception 'Cannot enter pending_closing until the contract is fully signed and payment is held or partial'
          using errcode = '22023';
      end if;
    end if;

    if new.status = 'completed' then
      new.closed_at = now();
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_transactions_transition
  before update on public.transactions
  for each row execute procedure public.enforce_transaction_transition();

create policy "transactions_update"
  on public.transactions for update
  using (public.is_transaction_party(id) or public.is_admin());

-- ─── transaction_tasks ───────────────────────────────────────────────────────
create table public.transaction_tasks (
  id                uuid primary key default uuid_generate_v4(),
  transaction_id    uuid not null references public.transactions(id) on delete cascade,
  title             text not null,
  assigned_party_id uuid references public.party_roles(id),
  status            text not null default 'open' check (status in ('open', 'in_progress', 'done', 'skipped')),
  due_date          date,
  order_index       smallint not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_transaction_tasks_transaction_id on public.transaction_tasks(transaction_id, order_index);

create trigger trg_transaction_tasks_set_updated_at
  before update on public.transaction_tasks
  for each row execute procedure public.set_updated_at();

alter table public.transaction_tasks enable row level security;

create policy "transaction_tasks_select"
  on public.transaction_tasks for select
  using (public.is_transaction_party(transaction_id) or public.is_admin());

create policy "transaction_tasks_insert"
  on public.transaction_tasks for insert
  with check (public.is_transaction_party(transaction_id) or public.is_admin());

create policy "transaction_tasks_update"
  on public.transaction_tasks for update
  using (public.is_transaction_party(transaction_id) or public.is_admin());

-- ─── Default checklist seeding ───────────────────────────────────────────────
-- Re-defines the two transaction-creating functions from migration 013 to
-- also seed a starter checklist. Task titles are deliberately generic
-- organizational labels, not legal claims about what's required to close.
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

  update public.offers set status = 'accepted' where id = p_offer_id;

  update public.listings set lifecycle_status = 'under_contract' where id = v_listing_id;

  insert into public.transactions (listing_id, source_type, source_id)
  values (v_listing_id, 'offer', p_offer_id)
  returning id into v_transaction_id;

  insert into public.transaction_tasks (transaction_id, title, order_index)
  values
    (v_transaction_id, 'Sign purchase agreement', 1),
    (v_transaction_id, 'Arrange payment', 2),
    (v_transaction_id, 'Finalize closing', 3);

  return v_transaction_id;
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

  insert into public.transaction_tasks (transaction_id, title, order_index)
  values
    (v_transaction_id, 'Sign lease agreement', 1),
    (v_transaction_id, 'Arrange security deposit', 2),
    (v_transaction_id, 'Confirm move-in date', 3);

  return v_transaction_id;
end;
$$;
