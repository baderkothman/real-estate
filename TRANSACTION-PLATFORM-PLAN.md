# Real Estate Platform: Full Transactional Architecture Remediation

## Context

`real-estate` ("Othman Real Estate") is currently a lean, single-country (Lebanon) property **listing directory** built on Next.js 15 + Supabase + Stripe: any account can list a property (admin-moderated) and save/browse others', and Stripe handles only SaaS-style plan subscriptions (free/pro/agency). There is no distinction between a physical property and a market listing, no buyer/seller/agent role concept beyond `user`/`admin`, no messaging/scheduling/offers/applications, no maps, no notifications, and no transaction machinery of any kind — "contact" is a bare `mailto:`/`tel:` link.

The user supplied an extensive research report describing a full modern transactional real-estate platform (discovery → evaluate → save/compare → contact/schedule → negotiate → offer/application → agreement → signature → deposit/payment → completion → post-transaction management) and asked for a gap analysis plus direct implementation against the existing codebase — not a rebuild, not a competitor clone.

Three things were confirmed with the user before scoping this plan:
1. **Full transactional platform** tier — implement the complete report scope (offers, rental applications, e-signature abstraction, payment/ledger architecture, transaction workspace, regional rules, audit/events), not just foundational fixes.
2. **Per-transaction `Party`/`PartyRole` model** — `profiles.role` stays `user`/`admin` for account access; buyer/seller/landlord/tenant/agent roles attach to a specific listing or transaction, not globally to the account (one person can be seller on listing A and buyer on listing B).
3. **Real map integration now** (Mapbox), with the user provisioning the API key; the app must degrade gracefully (list-only) when unconfigured.

Two independent P0 issues were found during exploration and must be fixed regardless of scope tier:
- **RLS gap**: `properties_update` policy lets a non-admin owner update *any* column (including `status`, `is_featured`) on their own row via a direct PostgREST call, bypassing the Server Action's app-layer `sanitizePropertyInput()` — the only thing currently preventing self-approval. This needs a DB-level guard (trigger), not just app code.
- **Unclosed billing loop**: `createCheckoutSessionAction` creates a real Stripe subscription checkout, but no webhook exists anywhere in the repo, so a successful payment never updates `profiles.plan` — `STRIPE_WEBHOOK_SECRET` is declared in env templates but referenced nowhere in code.

This plan is genuinely multi-week in scope. It is broken into 11 dependency-ordered, independently-shippable milestones (matching the report's own recommended build sequence), each leaving `main` in a working, deployable state. Nothing here fabricates legal compliance, working payment capture, or working e-signature completion — provider integrations ship as abstractions with safe mock/dev fallbacks, and every point requiring a business/legal decision or a paid credential is called out explicitly rather than silently assumed.

## Architecture

### Design principle for new tables' RLS

The codebase today has two competing RLS patterns: self-service RLS (`saved_properties`) and admin-client-mediated writes bypassing RLS (`profiles`, since migration 002). Every new party-linked or financial table adopts a **third, stricter pattern**: SELECT is RLS-scoped via an `is_party_of()` SECURITY DEFINER helper (mirrors existing `is_admin()`); free-form field writes (message body, note text) get narrow owner-only RLS; **state-transition fields (status, amounts, role, linkage) get no direct client UPDATE grant at all** — they're mutated only through SECURITY DEFINER RPC functions that re-validate the transition server-side. This closes the exact class of bug found in `properties_update` for every future table, not just the original one.

### Domain model (new/changed tables)

- **`properties`** (trimmed to physical facts: owner, address/city, lat/lng, geocode_status, bed/bath/area, property_type, images) + **`listings`** (new — market ad: property_id, listed_by, listing_type, price, `status` lifecycle enum, is_featured, published/expires/sold timestamps). Splits today's monolithic `properties` row so a unit can be re-listed, taken off-market, or hold history without re-entering physical facts, and so moderation/sale/promotion state stop being three independent booleans on one row.
  - Migration path: additive only. New `properties`+`listings` created and backfilled (one `listings` row per legacy `properties` row); old table renamed to `properties_legacy` (not dropped) with a compatibility view for one release cycle; dropped only after verifying zero references (Milestone 3).
- **`listing_history`** — narrow trigger-populated log of `status`/`price` changes (powers "3 price changes"/days-on-market UX cheaply), kept separate from the generic `audit_log` (forensic/compliance record for everything else).
- **`party_roles`** — `profile_id, role ('buyer'|'seller'|'landlord'|'tenant'|'listing_agent'|'buyer_agent'|'other'), listing_id?, transaction_id?`. Implements the report's `Party`/`PartyRole` concept as one join table (no separate `parties` table needed — `profiles` already is the account/party entity).
- **Discovery/decision-support**: `saved_searches` (+ `search_alerts`), `comparisons`, `property_notes`, `hidden_listings` — mirrors existing `saved_properties` shape, repointed at `listing_id`.
- **Scheduling**: `viewings` — explicit lifecycle (`requested → confirmed → completed`, branches `rescheduled/cancelled/no_show`), proposed slots as jsonb, confirmed start/end.
- **Messaging**: `conversations` / `conversation_participants` / `messages` (transaction-aware threads) + **`inquiries`** (lightweight one-shot "I'm interested" record replacing the current mailto sidebar; promotes to a real conversation on first reply).
- **Offers**: `offers` (aggregate status: draft/submitted/countered/accepted/rejected/withdrawn/expired) + **`offer_revisions`** (append-only, never mutated/deleted — every counter is a new revision, satisfying "never overwrite historical offers").
- **`rental_applications`** — separate from offers, own status enum, explicit **stub** `screening_status`/`screening_provider` fields (no real background-check integration — columns exist so one can be added later without a schema change).
- **Transaction workspace**: `transactions` (listing_id, source_type/source_id polymorphic link to the accepted offer or approved application, and — critically — **four independently-updatable fields**: `contract_status`, `payment_status`, `payout_status`, `dispute_status`, plus an overall `transaction_status` a transition function sets explicitly, never inferred from a raw webhook) + `transaction_tasks`.
- **Documents/e-signature**: `documents` (+ Supabase Storage — first real Storage usage in this app) + `document_signers`; `envelope_provider`/`envelope_status` fields sit behind a provider abstraction (`lib/esign/*`) with only a `mock` implementation shipped.
- **Payments/ledger**: `payment_intents`, `payments`, `refunds`, `transfers`, `payouts`, `disputes` (Stripe Connect's actual object model — chosen over a bespoke "escrow" concept, which is never built or named) + **`ledger_entries`** (append-only double-entry: every economic event posts a balanced debit/credit pair, enforced in the posting service function). UI/copy uses "Payment held by Stripe," never "escrow."
- **`commission_configs`** — configurable rate/flat-fee by scope (platform default vs. agent override) and effective date range, so historical transactions retain the terms used at the time even if config later changes.
- **`regional_rules`** — generic `region_code`/`rule_key`/`rule_value` config table, seeded with **Lebanon (`LB`) defaults only**, each flagged `TODO: legal review` in seed data. The report's Saudi REGA/Ejar section is deliberately **not modeled at all** — it's a different regulatory regime this app doesn't target, and stubbing it would be misleading.
- **Cross-cutting**: `audit_log` (actor/entity/action/before/after on every high-impact change), `events` (plain-Postgres transactional outbox — no Kafka; a cron-polled dispatcher fans out to `notifications`), `notifications` (persisted, in-app, replacing today's zero-notification/ephemeral-toast-free state).

### State machines (transition tables live in full detail in the milestone work; summarized here)

- **Listing**: `draft → pending_review → active ⇄ under_offer → under_contract → sold|leased`, with `withdrawn`/`expired`/`rejected` branches and `archived` terminal state. Every transition: server-side authorization + current-state check, `listing_history` row, `audit_log` row, `events` row, notification fan-out.
- **Viewing**: `requested → confirmed → completed`, branches `rescheduled`/`cancelled`/`no_show`.
- **Offer**: `draft → submitted → accepted|rejected|countered|withdrawn|expired`; a counter creates a new `offer_revisions` row, doesn't mutate the old one.
- **Rental application**: `draft → submitted → under_review → approved|conditionally_approved|rejected`, `withdrawn` any time pre-decision.
- **Document/e-sign**: `not_started → draft → sent → viewed → partially_signed → completed`, branches `declined`/`expired`/`voided`. Mock provider only advances via an explicit dev-only "simulate signature" action — never silently.
- **Transaction**: `active → pending_closing → completed`, branches `cancelled`/`terminated`. Entering `pending_closing` requires (per `regional_rules`) `contract_status='fully_signed'` AND `payment_status IN ('held','partial')` — checked in the transition function, not a DB CHECK (needs cross-table reads).

### Module boundaries

Follows the existing convention exactly: `app/actions/*.ts` (thin, auth-checked) → `services/*.service.ts` (business logic, Supabase client calls) → `lib/supabase/{server,admin}.ts`. New service/action pairs per domain: `listing`, `party`, `discovery`, `viewing`, `messaging`, `offer`, `application`, `transaction`, `document`, `payment`, `commission`, `regional-rules`, `audit`, `events`, `notification`. New provider abstractions live under `lib/{geocoding,maps,esign,payments}/*`.

**Route handlers** (the only ones needed — everything else stays a Server Action, preserving the existing pattern):
1. `app/api/webhooks/stripe/route.ts` — unavoidable (Stripe POSTs unauthenticated); also finally closes the existing billing-loop gap.
2. `app/api/cron/dispatch-events/route.ts` — outbox dispatcher.
3. `app/api/cron/expire-listings/route.ts` — sweep expired listings/stale viewings.
4. `app/api/webhooks/esign/route.ts` — scaffolded inert (501/no-op) until a real e-sign provider is chosen.

### Provider abstractions (all: interface + safe no-op/mock default + env-gated real implementation, never throwing when unconfigured)

- **Geocoding** (`lib/geocoding/*`): `MAPBOX_GEOCODING_TOKEN` server-side; unset → `geocode_status='skipped'`, listing still saves, no map marker.
- **Maps client** (`components/map/*`, wrapping `mapbox-gl`): `NEXT_PUBLIC_MAPBOX_TOKEN`; unset → map toggle hidden with an inline "Map view requires configuration" message, list view unaffected.
- **E-signature** (`lib/esign/*`): only a `mock` implementation ships, clearly labeled "Development mode — signatures are simulated" in UI. Real vendor selection is an explicit deferred decision.
- **Payments** (`lib/payments/*`, Stripe Connect): reuses the existing `STRIPE_SECRET_KEY`, finally wires up the already-declared-but-unused `STRIPE_WEBHOOK_SECRET`/`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. Payout/transfer UI stays hidden until `STRIPE_CONNECT_CLIENT_ID` is provisioned (separate Stripe approval process) — deposit collection can ship independently of payout.

## Milestones

Each is independently shippable and leaves the app deployable. Rough sizing: S = 1–3 days, M = 4–7 days, L = 1.5–2.5 weeks.

1. **Architecture & domain fixes (L)** — RLS trigger guard hotfix (ship first, standalone); `properties`/`listings` split with backfill + compat view + `properties_legacy` fence; `party_roles`, `audit_log`, `events` tables; Stripe webhook closing the billing loop. *DoD: build passes; all existing property flows work unchanged against the new schema; non-admin cannot mutate `listings.status` via direct PostgREST (verified with an anon-key script); test-mode subscription updates `profiles.plan`.*
2. **Permissions & state-transition hardening (M)** — DB-enforced `listing_status` transition function; `listing_history`; every admin action now writes `audit_log`. *DoD: invalid transitions rejected server-side with a clear error; price/status timeline populated.*
3. **Search/listing UX repair (M)** — wire up the already-built-but-unused search box + beds/baths filters; drop `properties_legacy` once verified unreferenced. *DoD: `?search=&minBeds=&minBaths=` work end-to-end; no regression to existing `EmptyState`/filter-chip behavior.*
4. **Role journeys foundation (M)** — backfill seller/landlord `party_roles` from existing listing ownership; role-aware `/dashboard` overview. *DoD: dashboard shows a "Your Roles" summary with zero change to existing flows.*
5. **Scheduling & messaging (L)** — `viewings`, `conversations`/`messages`, `inquiries`; replaces the bare mailto/tel sidebar with a real contact panel. *DoD: request-viewing and send-inquiry work end to end from a listing page; owner can confirm/cancel; messaging works once a conversation exists.*
6. **Offers & rental applications (L)** — full submit/counter/accept/reject/withdraw flow with immutable revisions; separate rental application flow; wired into `listing_status` (`active ⇄ under_offer → under_contract`). *DoD: acceptance creates a `transactions` shell row; revision history never overwritten.*
7. **Transaction workspace (L)** — `app/dashboard/transactions/[id]` with Overview/Participants/Tasks tabs live (Documents/Payments stubbed until M8); transaction state machine enforced server-side. *DoD: an accepted offer produces a navigable, functional workspace.*
8. **Documents/e-sign/payments/ledger/commission (XL, split 8a/8b)** — 8a: documents + mock e-sign + Storage bucket. 8b: `payment_intents`/`payments`/`refunds`/`transfers`/`payouts`/`disputes`/`ledger_entries`/`commission_configs`/`regional_rules` (LB-seeded); Stripe webhook extended for PaymentIntent/Transfer/Dispute events. *DoD: test-mode deposit intent → webhook-confirmed → balanced ledger entry posted; `payment_status` updates independently of `contract_status`; zero occurrences of "escrow" in UI copy.*
9. **Decision support & notifications (M)** — saved searches/alerts, compare, notes, hide-listing; persisted `notifications` + outbox dispatcher cron + notification bell. *DoD: saved search + alert surfaces new matching listings; compare works for up to 4 listings.*
10. **Accessibility, responsive, SEO polish (S/M)** — fix the specific flagged gaps: edit-form `Label htmlFor` pairing, `title=`→`aria-label` on admin icon buttons, `aria-live`/`role="alert"` on inline banners, skip-link, `app/sitemap.ts`/`app/robots.ts`, JSON-LD on listing pages. *DoD: no missing-label errors on create/edit/admin; sitemap/robots resolve; JSON-LD validates.*
11. **Analytics & final polish (S)** — extend analytics RPCs for the new funnel (listings→viewings→offers→transactions→closed); admin audit-log viewer. *DoD: funnel metrics render without N+1 queries; audit log searchable.*

### Testing (introduced at Milestone 1, not deferred)

No test infra exists today. Add **Vitest** (unit/integration — state-transition validity, commission calc, ledger balance-invariant are the highest-value tests since bugs here are silent financial corruption) and **Playwright** (a small set of critical-path E2E specs, introduced once real journeys exist from Milestone 6 onward: browse→save→offer→counter→accept→workspace; list→apply→approve). Add a regression test for the exact P0 RLS bug (non-admin cannot mutate protected columns directly). Re-run existing `knip` after each milestone to catch dead code from the `properties`→`listings` split. A minimal CI workflow is proposed alongside this but flagged as a process change requiring explicit confirmation, not assumed.

## Explicitly deferred / requires the user's decision

- Mapbox API key provisioning (map ships functional-but-inert without it).
- E-signature vendor selection + legal sign-off on templates (mock provider only).
- Legal review of Lebanese contract/offer/lease template content and every `regional_rules` seed value.
- Stripe Connect activation (payout/transfer leg only — deposit collection doesn't need it).
- Real background/credit screening provider for rental applications (stub columns only).
- Supabase Storage migration for listing images (documents need it in M8a; images staying as URL strings is out of this plan's scope unless requested).
- Cron hosting mechanism (Vercel Cron vs. Supabase scheduled functions) — depends on deployment target.
- CI workflow introduction.
- Any regional rules beyond Lebanon.

## Critical files

- `supabase/migrations/{001_init,002_security_hardening,003_harden_function_search_path}.sql` — existing schema/RLS conventions to extend, not replace.
- `services/property.service.ts`, `app/actions/properties.ts` — the pattern every new service/action pair follows; `property.service.ts` splits into `property.service.ts` (trimmed) + `listing.service.ts` (new).
- `types/index.ts` — central domain types; `Property`/`PropertyFilters` split, new types added per domain.
- `lib/supabase/{server,admin}.ts` — the two client factories every new service uses.
- `app/actions/checkout.ts`, `lib/stripe.ts` — billing loop being closed in Milestone 1.
- `app/properties/[id]/page.tsx`, `components/property/property-card.tsx`, `app/properties/page.tsx`, `components/property/property-filters.tsx` — consumers touched across Milestones 1, 3, 5.
- `middleware.ts` — existing auth/role gating pattern new routes/pages follow.
- `SYTEM-DESIGN.md` — binding visual design spec for all new UI (note the filename typo is intentional/real).
- `lib/constants.ts` — plan limits, Lebanon city list; `regional_rules` and commission config extend rather than replace this.

## Verification

- After each milestone: `npm run lint`, `npm run build`, and (from Milestone 1 onward) `npm run test`.
- Manually re-verify the P0 RLS fix with a direct anon-key + user-JWT PostgREST call attempting to set `listings.status`/`is_featured` — must be rejected.
- Manually complete a Stripe test-mode subscription checkout and confirm `profiles.plan` updates without any manual admin action.
- Run through existing critical flows unchanged after Milestone 1's schema split: create listing → admin approve → public visible → save → edit → admin feature/unfeature → delete.
- From Milestone 6 onward, run the Playwright critical-path specs (offer negotiation, rental application) end to end.
- Grep UI copy and code comments for "escrow" after Milestone 8 — must return zero hits.
- Confirm graceful degradation: unset `NEXT_PUBLIC_MAPBOX_TOKEN`/`ESIGN_*`/`STRIPE_CONNECT_CLIENT_ID` and verify the app still builds and runs with the corresponding features cleanly hidden, not broken.
