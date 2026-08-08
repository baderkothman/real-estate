-- Milestone 8b: payment tracking, a double-entry ledger, commission
-- configuration, and a regional-rules table.
--
-- IMPORTANT — what this is and isn't: `STRIPE_SECRET_KEY` is already
-- configured for this app's SaaS plan billing, and that same Stripe account
-- is reused here to collect a one-time deposit payment via Stripe Checkout
-- (`mode: 'payment'`) — this is a real, working Stripe integration, not a
-- mock. What is NOT configured is Stripe Connect: without it, a deposit
-- collected here lands in the platform's own Stripe balance, with no
-- automated way to pay it out to the seller/landlord. `transfers`/`payouts`
-- below are schema-ready but functionally inert until Connect is activated
-- (see README). Copy anywhere in the app referring to held funds must say
-- "payment held by Stripe" — never "escrow" — since no legally-recognized
-- escrow/custodian integration exists.
--
-- `transaction_status`/`contract_status`/`payment_status`/`payout_status`/
-- `dispute_status` remain independent fields (already true since Milestone
-- 6) — nothing here collapses them into each other. A Stripe dispute
-- updates `dispute_status` only; it never silently flips
-- `transactions.status` to cancelled.

create table public.payment_intents (
  id                 uuid primary key default uuid_generate_v4(),
  transaction_id     uuid not null references public.transactions(id) on delete cascade,
  provider           text not null default 'stripe',
  provider_intent_id text,
  purpose            text not null check (purpose in ('deposit', 'rent_payment', 'commission', 'other')),
  amount             numeric(15, 2) not null check (amount > 0),
  currency           text not null default 'usd',
  status             text not null default 'requires_payment_method'
                        check (status in (
                          'requires_payment_method', 'requires_confirmation', 'requires_action',
                          'processing', 'requires_capture', 'succeeded', 'canceled'
                        )),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table public.payments (
  id                uuid primary key default uuid_generate_v4(),
  payment_intent_id uuid not null references public.payment_intents(id) on delete cascade,
  amount            numeric(15, 2) not null,
  captured_at       timestamptz,
  held_by           text not null default 'stripe',
  released_at       timestamptz,
  created_at        timestamptz not null default now()
);

create table public.refunds (
  id                 uuid primary key default uuid_generate_v4(),
  payment_id         uuid not null references public.payments(id) on delete cascade,
  amount             numeric(15, 2) not null check (amount > 0),
  reason             text,
  provider_refund_id text,
  status             text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  created_at         timestamptz not null default now()
);

-- Schema-ready for when Stripe Connect is activated — not written to by
-- any code path today.
create table public.transfers (
  id                   uuid primary key default uuid_generate_v4(),
  transaction_id       uuid not null references public.transactions(id) on delete cascade,
  payee_party_id       uuid not null references public.party_roles(id),
  amount               numeric(15, 2) not null check (amount > 0),
  provider_transfer_id text,
  status               text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'reversed')),
  created_at           timestamptz not null default now()
);

create table public.payouts (
  id                 uuid primary key default uuid_generate_v4(),
  transfer_id        uuid not null references public.transfers(id) on delete cascade,
  provider_payout_id text,
  status             text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  arrived_at         timestamptz,
  created_at         timestamptz not null default now()
);

create table public.disputes (
  id                 uuid primary key default uuid_generate_v4(),
  payment_id         uuid not null references public.payments(id) on delete cascade,
  provider_dispute_id text,
  reason             text,
  status             text not null default 'open' check (status in ('open', 'won', 'lost', 'resolved')),
  opened_at          timestamptz not null default now(),
  resolved_at        timestamptz
);

-- Append-only double-entry ledger — the source of financial truth. Every
-- economic event posts a balanced debit/credit pair sharing an
-- `entry_group_id`; nothing here is ever updated or deleted.
create table public.ledger_entries (
  id                  bigserial primary key,
  transaction_id      uuid not null references public.transactions(id) on delete cascade,
  entry_group_id      uuid not null,
  account             text not null,
  direction           text not null check (direction in ('debit', 'credit')),
  amount              numeric(15, 2) not null check (amount > 0),
  currency            text not null default 'usd',
  related_payment_id  uuid references public.payments(id),
  related_transfer_id uuid references public.transfers(id),
  memo                text,
  created_at          timestamptz not null default now()
);

-- Commission terms are looked up here but the *applied* rate is copied onto
-- `transactions` at calculation time (columns added below) so historical
-- transactions never change if this config changes later.
create table public.commission_configs (
  id              uuid primary key default uuid_generate_v4(),
  scope           text not null check (scope in ('platform_default', 'agent_override')),
  agent_profile_id uuid references public.profiles(id),
  listing_type    listing_type,
  rate_percent    numeric(5, 2),
  flat_fee        numeric(15, 2),
  effective_from  date not null default current_date,
  effective_to    date,
  created_by      uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  check (scope = 'platform_default' or agent_profile_id is not null)
);

create table public.regional_rules (
  id           uuid primary key default uuid_generate_v4(),
  region_code  text not null default 'LB',
  rule_key     text not null,
  rule_value   jsonb not null,
  description  text,
  unique (region_code, rule_key)
);

alter table public.transactions
  add column commission_rate_percent numeric(5, 2),
  add column commission_amount numeric(15, 2);

create index idx_payment_intents_transaction_id on public.payment_intents(transaction_id);
create index idx_payments_payment_intent_id on public.payments(payment_intent_id);
create index idx_refunds_payment_id on public.refunds(payment_id);
create index idx_transfers_transaction_id on public.transfers(transaction_id);
create index idx_payouts_transfer_id on public.payouts(transfer_id);
create index idx_disputes_payment_id on public.disputes(payment_id);
create index idx_ledger_entries_transaction_id on public.ledger_entries(transaction_id, entry_group_id);

create trigger trg_payment_intents_set_updated_at
  before update on public.payment_intents
  for each row execute procedure public.set_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────────────
-- Financial writes never go through client-facing RLS insert/update
-- policies — every write here goes through a service-role-backed Server
-- Action (createDepositCheckoutSessionAction, etc.) or the Stripe webhook
-- handler, each of which performs its own explicit authorization check
-- before writing, mirroring the audit_log/party_roles pattern.
alter table public.payment_intents enable row level security;
alter table public.payments enable row level security;
alter table public.refunds enable row level security;
alter table public.transfers enable row level security;
alter table public.payouts enable row level security;
alter table public.disputes enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.commission_configs enable row level security;
alter table public.regional_rules enable row level security;

create policy "payment_intents_select"
  on public.payment_intents for select
  using (public.is_transaction_party(transaction_id) or public.is_admin());

create policy "payments_select"
  on public.payments for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.payment_intents pi
      where pi.id = payments.payment_intent_id and public.is_transaction_party(pi.transaction_id)
    )
  );

create policy "refunds_select"
  on public.refunds for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.payments p
      join public.payment_intents pi on pi.id = p.payment_intent_id
      where p.id = refunds.payment_id and public.is_transaction_party(pi.transaction_id)
    )
  );

create policy "transfers_select"
  on public.transfers for select
  using (public.is_transaction_party(transaction_id) or public.is_admin());

create policy "payouts_select"
  on public.payouts for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.transfers t
      where t.id = payouts.transfer_id and public.is_transaction_party(t.transaction_id)
    )
  );

create policy "disputes_select"
  on public.disputes for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.payments p
      join public.payment_intents pi on pi.id = p.payment_intent_id
      where p.id = disputes.payment_id and public.is_transaction_party(pi.transaction_id)
    )
  );

-- The ledger and commission configuration are internal financial records —
-- admin-only, same as audit_log.
create policy "ledger_entries_select_admin"
  on public.ledger_entries for select
  using (public.is_admin());

create policy "commission_configs_select_admin"
  on public.commission_configs for select
  using (public.is_admin());

-- Regional rules are non-sensitive configuration — publicly readable so the
-- UI can surface rule-derived copy (e.g. minimum deposit) without an extra
-- privileged round-trip.
create policy "regional_rules_select_all"
  on public.regional_rules for select
  using (true);

-- ─── Seed: Lebanon (LB) defaults ────────────────────────────────────────────
-- Conservative, non-binding placeholders — NOT a legal compliance claim.
-- Every value here needs professional legal review before being treated as
-- an actual policy.
insert into public.regional_rules (region_code, rule_key, rule_value, description) values
  ('LB', 'deposit_min_percent', '5', 'TODO: legal review. Suggested floor for a sale deposit, as a percent of offer price.'),
  ('LB', 'deposit_max_percent', '20', 'TODO: legal review. Suggested ceiling for a sale deposit, as a percent of offer price.'),
  ('LB', 'default_commission_rate_percent', '2.5', 'TODO: business/legal review. Platform default commission rate absent an agent-specific override.')
on conflict (region_code, rule_key) do nothing;

insert into public.commission_configs (scope, rate_percent, created_at)
values ('platform_default', 2.5, now());
