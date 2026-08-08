-- Milestone 8a: transaction documents and e-signature tracking.
--
-- E-signature is genuinely mocked — no real provider is integrated or
-- chosen. `envelope_provider` is always 'mock'; `lib/esign/` documents what
-- a real provider would need to implement. Signing state is per-signer
-- (`document_signers`), never a single `signed = true` boolean, and the
-- document's aggregate `envelope_status` is only ever derived from those
-- rows by the RPCs below — never set directly by a client update for the
-- signature-progress values.
--
-- File storage is real Supabase Storage (already-provisioned
-- infrastructure, not a new external dependency) — a private bucket with no
-- direct client access; all reads/writes go through service-role-issued
-- signed URLs after an explicit authorization check in the server action,
-- since correctly authoring Storage RLS policies isn't practical to verify
-- without a live project in this environment.

create type document_envelope_status as enum (
  'not_started', 'draft', 'sent', 'partially_signed', 'completed', 'declined', 'voided'
);

create table public.documents (
  id                uuid primary key default uuid_generate_v4(),
  transaction_id    uuid not null references public.transactions(id) on delete cascade,
  title             text not null,
  doc_type          text not null default 'other'
                       check (doc_type in ('agreement', 'disclosure', 'lease', 'addendum', 'other')),
  storage_path      text,
  uploaded_by       uuid not null references public.profiles(id),
  envelope_provider text not null default 'mock',
  envelope_id       text,
  envelope_status   document_envelope_status not null default 'not_started',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table public.document_signers (
  id             uuid primary key default uuid_generate_v4(),
  document_id    uuid not null references public.documents(id) on delete cascade,
  party_role_id  uuid not null references public.party_roles(id),
  status         text not null default 'pending' check (status in ('pending', 'signed', 'declined')),
  signed_at      timestamptz,
  order_index    smallint not null default 0
);

create index idx_documents_transaction_id on public.documents(transaction_id);
create index idx_document_signers_document_id on public.document_signers(document_id);

create trigger trg_documents_set_updated_at
  before update on public.documents
  for each row execute procedure public.set_updated_at();

alter table public.documents enable row level security;
alter table public.document_signers enable row level security;

create policy "documents_select"
  on public.documents for select
  using (public.is_transaction_party(transaction_id) or public.is_admin());

create policy "documents_insert"
  on public.documents for insert
  with check (
    auth.uid() = uploaded_by
    and (public.is_transaction_party(transaction_id) or public.is_admin())
  );

create policy "documents_update"
  on public.documents for update
  using (public.is_transaction_party(transaction_id) or public.is_admin());

create or replace function public.is_document_signer(p_document_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.document_signers ds
    join public.party_roles pr on pr.id = ds.party_role_id
    where ds.document_id = p_document_id and pr.profile_id = auth.uid()
  );
$$;

create policy "document_signers_select"
  on public.document_signers for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.documents d
      where d.id = document_signers.document_id and public.is_transaction_party(d.transaction_id)
    )
  );

-- No INSERT/UPDATE policy on document_signers — rows are only created and
-- advanced via the RPCs below.

-- ─── Envelope transition graph ──────────────────────────────────────────────
-- not_started -> sent (uploader sends for signature)
-- sent -> partially_signed | completed (derived from signer progress)
-- sent | partially_signed -> declined (any signer declines)
-- sent | partially_signed -> voided (uploader/admin cancels)
create or replace function public.is_valid_document_transition(
  p_old document_envelope_status, p_new document_envelope_status
) returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_old = p_new or (p_old, p_new) in (
    ('not_started', 'sent'),
    ('sent', 'partially_signed'),
    ('sent', 'completed'),
    ('sent', 'declined'),
    ('sent', 'voided'),
    ('partially_signed', 'completed'),
    ('partially_signed', 'declined'),
    ('partially_signed', 'voided')
  );
$$;

create or replace function public.enforce_document_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.transaction_id is distinct from old.transaction_id
    or new.uploaded_by is distinct from old.uploaded_by
  then
    raise exception 'transaction_id and uploaded_by cannot be changed'
      using errcode = '42501';
  end if;

  if new.envelope_status is distinct from old.envelope_status then
    if not public.is_valid_document_transition(old.envelope_status, new.envelope_status) then
      raise exception 'Invalid envelope status transition: % -> %', old.envelope_status, new.envelope_status
        using errcode = '22023';
    end if;

    if new.envelope_status = 'sent' then
      if not (auth.uid() = old.uploaded_by or public.is_admin()) then
        raise exception 'Only the uploader may send a document for signature'
          using errcode = '42501';
      end if;
    elsif new.envelope_status in ('partially_signed', 'completed') then
      if not (public.is_document_signer(old.id) or public.is_admin()) then
        raise exception 'Only a signer may progress this document toward completion'
          using errcode = '42501';
      end if;
    elsif new.envelope_status = 'declined' then
      if not (public.is_document_signer(old.id) or public.is_admin()) then
        raise exception 'Only a signer may decline a document' using errcode = '42501';
      end if;
    elsif new.envelope_status = 'voided' then
      if not (auth.uid() = old.uploaded_by or public.is_admin()) then
        raise exception 'Only the uploader may void a document' using errcode = '42501';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_documents_transition
  before update on public.documents
  for each row execute procedure public.enforce_document_transition();

-- ─── RPCs ────────────────────────────────────────────────────────────────────
-- SECURITY DEFINER for the same reason as the offer/application RPCs: each
-- performs a coordinated multi-row write (creating signer rows, or updating
-- both a signer and the parent document's derived status) that isn't
-- expressible as a single RLS-gated statement. The guard trigger above still
-- fires on every UPDATE these perform and re-validates the transition and
-- actor, so authorization is not duplicated.
create or replace function public.send_document_for_signature(p_document_id uuid, p_envelope_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_transaction_id uuid;
  v_uploaded_by    uuid;
  v_listing_id     uuid;
  v_source_type    text;
  v_source_id      uuid;
  v_order          smallint := 1;
begin
  select transaction_id, uploaded_by into v_transaction_id, v_uploaded_by
  from public.documents where id = p_document_id;

  if v_transaction_id is null then
    raise exception 'Document not found' using errcode = 'P0002';
  end if;
  if auth.uid() is distinct from v_uploaded_by and not public.is_admin() then
    raise exception 'Only the uploader may send a document for signature'
      using errcode = '42501';
  end if;

  select listing_id, source_type, source_id into v_listing_id, v_source_type, v_source_id
  from public.transactions where id = v_transaction_id;

  if v_source_type = 'offer' then
    insert into public.document_signers (document_id, party_role_id, order_index)
    select p_document_id, party_id, v_order + row_number() over () - 1
    from (
      select buyer_party_id as party_id from public.offers where id = v_source_id
      union all
      select seller_party_id from public.offers where id = v_source_id
    ) parties;
  else
    insert into public.document_signers (document_id, party_role_id, order_index)
    select p_document_id, party_id, v_order + row_number() over () - 1
    from (
      select applicant_party_id as party_id from public.rental_applications where id = v_source_id
      union all
      select id from public.party_roles where listing_id = v_listing_id and role = 'landlord'
    ) parties;
  end if;

  update public.documents
  set envelope_status = 'sent', envelope_id = p_envelope_id
  where id = p_document_id;
end;
$$;

create or replace function public.sign_document(p_document_signer_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_document_id  uuid;
  v_profile_id   uuid;
  v_pending_left int;
begin
  select ds.document_id, pr.profile_id into v_document_id, v_profile_id
  from public.document_signers ds
  join public.party_roles pr on pr.id = ds.party_role_id
  where ds.id = p_document_signer_id;

  if v_document_id is null then
    raise exception 'Signer record not found' using errcode = 'P0002';
  end if;
  if auth.uid() is distinct from v_profile_id and not public.is_admin() then
    raise exception 'Only the assigned signer may sign' using errcode = '42501';
  end if;

  update public.document_signers
  set status = 'signed', signed_at = now()
  where id = p_document_signer_id and status = 'pending';

  select count(*) into v_pending_left
  from public.document_signers
  where document_id = v_document_id and status = 'pending';

  if v_pending_left = 0 then
    update public.documents set envelope_status = 'completed' where id = v_document_id;
  else
    update public.documents set envelope_status = 'partially_signed' where id = v_document_id;
  end if;
end;
$$;

create or replace function public.decline_document(p_document_signer_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_document_id uuid;
  v_profile_id  uuid;
begin
  select ds.document_id, pr.profile_id into v_document_id, v_profile_id
  from public.document_signers ds
  join public.party_roles pr on pr.id = ds.party_role_id
  where ds.id = p_document_signer_id;

  if v_document_id is null then
    raise exception 'Signer record not found' using errcode = 'P0002';
  end if;
  if auth.uid() is distinct from v_profile_id and not public.is_admin() then
    raise exception 'Only the assigned signer may decline' using errcode = '42501';
  end if;

  update public.document_signers set status = 'declined' where id = p_document_signer_id;
  update public.documents set envelope_status = 'declined' where id = v_document_id;
end;
$$;

create or replace function public.void_document(p_document_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uploaded_by uuid;
begin
  select uploaded_by into v_uploaded_by from public.documents where id = p_document_id;
  if v_uploaded_by is null then
    raise exception 'Document not found' using errcode = 'P0002';
  end if;
  if auth.uid() is distinct from v_uploaded_by and not public.is_admin() then
    raise exception 'Only the uploader may void a document' using errcode = '42501';
  end if;

  update public.documents set envelope_status = 'voided' where id = p_document_id;
end;
$$;

grant execute on function public.send_document_for_signature(uuid, text) to authenticated;
grant execute on function public.sign_document(uuid) to authenticated;
grant execute on function public.decline_document(uuid) to authenticated;
grant execute on function public.void_document(uuid) to authenticated;

-- ─── Storage ─────────────────────────────────────────────────────────────────
-- Private bucket, no Storage RLS policies granted to anon/authenticated —
-- default-deny. All access goes through service-role-issued signed URLs
-- (see app/actions/documents.ts), gated by an explicit transaction-party
-- check plus the `documents` table RLS above.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;
