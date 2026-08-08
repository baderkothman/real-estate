-- Milestone 5: replaces the bare mailto/tel sidebar with structured contact.
-- `inquiries` is a lightweight one-shot "I'm interested" record — cheap to
-- send, doesn't require spinning up a full thread. A reply from the listing
-- owner promotes it into a real `conversations` thread (see
-- `reply_to_inquiry` below), carrying the original question over as the
-- thread's first message so context isn't lost.

create table public.conversations (
  id              uuid primary key default uuid_generate_v4(),
  listing_id      uuid not null references public.listings(id) on delete cascade,
  -- Linked to a transaction once one exists (Milestone 7) — no FK yet since
  -- that table doesn't exist. Additive column, added there.
  transaction_id  uuid,
  created_at      timestamptz not null default now()
);

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  last_read_at    timestamptz,
  primary key (conversation_id, profile_id)
);

create table public.messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id),
  body            text not null,
  attachment_url  text,
  created_at      timestamptz not null default now()
);

create table public.inquiries (
  id              uuid primary key default uuid_generate_v4(),
  listing_id      uuid not null references public.listings(id) on delete cascade,
  from_profile_id uuid not null references public.profiles(id) on delete cascade,
  message         text not null,
  conversation_id uuid references public.conversations(id),
  status          text not null default 'new' check (status in ('new', 'replied', 'closed')),
  created_at      timestamptz not null default now()
);

create index idx_conversations_listing_id          on public.conversations(listing_id);
create index idx_conversation_participants_profile on public.conversation_participants(profile_id);
create index idx_messages_conversation_created      on public.messages(conversation_id, created_at);
create index idx_inquiries_listing_id               on public.inquiries(listing_id);
create index idx_inquiries_from_profile_id          on public.inquiries(from_profile_id);
create index idx_inquiries_status                   on public.inquiries(status);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.inquiries enable row level security;

create or replace function public.is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id and cp.profile_id = auth.uid()
  );
$$;

-- No INSERT policy on conversations/conversation_participants for
-- authenticated/anon: a conversation is only ever created atomically (with
-- its participants and first message) via `reply_to_inquiry` below, or a
-- future equivalent RPC. Messages within an existing conversation are a
-- plain insert, gated by messages_insert.
create policy "conversations_select"
  on public.conversations for select
  using (public.is_conversation_participant(id) or public.is_admin());

create policy "conversation_participants_select"
  on public.conversation_participants for select
  using (public.is_conversation_participant(conversation_id) or public.is_admin());

create policy "messages_select"
  on public.messages for select
  using (public.is_conversation_participant(conversation_id) or public.is_admin());

create policy "messages_insert"
  on public.messages for insert
  with check (auth.uid() = sender_id and public.is_conversation_participant(conversation_id));

create policy "inquiries_select"
  on public.inquiries for select
  using (
    from_profile_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.listings l where l.id = listing_id and l.listed_by = auth.uid())
  );

create policy "inquiries_insert"
  on public.inquiries for insert
  with check (
    auth.uid() = from_profile_id
    and exists (
      select 1 from public.listings l
      where l.id = listing_id and l.listed_by <> auth.uid()
    )
  );

create policy "inquiries_update"
  on public.inquiries for update
  using (
    from_profile_id = auth.uid()
    or exists (select 1 from public.listings l where l.id = listing_id and l.listed_by = auth.uid())
    or public.is_admin()
  );

-- `inquiries_update`'s USING clause governs WHO can attempt an update
-- (sender, listing owner, admin); this trigger governs WHAT they're allowed
-- to change, regardless of who they are — the same column-privilege pattern
-- established for `listings` in migrations 005/008. `conversation_id` may
-- move from null to a value exactly once (the reply-promotion path) and
-- never change again via a direct client update; `status` only moves
-- forward (new -> replied|closed, replied -> closed).
create or replace function public.enforce_inquiries_privilege_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.listing_id is distinct from old.listing_id
    or new.from_profile_id is distinct from old.from_profile_id
    or new.message is distinct from old.message
  then
    raise exception 'listing_id, from_profile_id, and message cannot be changed after an inquiry is created'
      using errcode = '42501';
  end if;

  if old.conversation_id is not null and new.conversation_id is distinct from old.conversation_id then
    raise exception 'conversation_id cannot be changed once set'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status
    and not (
      (old.status = 'new' and new.status in ('replied', 'closed'))
      or (old.status = 'replied' and new.status = 'closed')
    )
  then
    raise exception 'Invalid inquiry status transition: % -> %', old.status, new.status
      using errcode = '22023';
  end if;

  return new;
end;
$$;

create trigger trg_inquiries_privilege_guard
  before update on public.inquiries
  for each row execute procedure public.enforce_inquiries_privilege_guard();

-- ─── Promote an inquiry into a real conversation ────────────────────────────
-- SECURITY DEFINER because it performs a coordinated multi-table write
-- (conversations + conversation_participants + messages, none of which have
-- a general INSERT policy for authenticated users) — authorization is
-- therefore enforced explicitly in the function body, not via RLS.
create or replace function public.reply_to_inquiry(p_inquiry_id uuid, p_reply_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing_id       uuid;
  v_from_profile_id  uuid;
  v_original_message text;
  v_owner_id         uuid;
  v_conversation_id  uuid;
begin
  select listing_id, from_profile_id, message
    into v_listing_id, v_from_profile_id, v_original_message
  from public.inquiries
  where id = p_inquiry_id;

  if v_listing_id is null then
    raise exception 'Inquiry not found' using errcode = 'P0002';
  end if;

  select listed_by into v_owner_id from public.listings where id = v_listing_id;

  if auth.uid() is null or v_owner_id is null or v_owner_id <> auth.uid() then
    raise exception 'Only the listing owner may reply to this inquiry'
      using errcode = '42501';
  end if;

  insert into public.conversations (listing_id)
  values (v_listing_id)
  returning id into v_conversation_id;

  insert into public.conversation_participants (conversation_id, profile_id)
  values (v_conversation_id, v_from_profile_id), (v_conversation_id, v_owner_id);

  insert into public.messages (conversation_id, sender_id, body)
  values
    (v_conversation_id, v_from_profile_id, v_original_message),
    (v_conversation_id, v_owner_id, p_reply_body);

  update public.inquiries
  set conversation_id = v_conversation_id, status = 'replied'
  where id = p_inquiry_id;

  return v_conversation_id;
end;
$$;

grant execute on function public.reply_to_inquiry(uuid, text) to authenticated;
