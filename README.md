# Othman Real Estate

Lebanon-focused real estate marketplace built with Next.js, Supabase, and Stripe.

## What This App Includes

- Public property browsing with filtering (city, type, price, search)
- Property detail pages with owner contact info for signed-in users
- Supabase email/password authentication (register, login, reset password)
- User dashboard for creating, editing, and tracking listings
- Saved properties for authenticated users
- Admin panel for property moderation, user management, and analytics
- Stripe subscription checkout for `pro` and `agency` plans

## Tech Stack

- Framework: Next.js 15 (App Router)
- Language: TypeScript
- Styling: Tailwind CSS + shadcn/ui primitives
- Auth + Database: Supabase (Postgres + Auth + RLS)
- Billing: Stripe

## Project Structure

```text
app/                    # Routes, pages, layouts, API handlers
components/             # UI and feature components
services/               # Business/data access layer
lib/                    # Shared utilities, constants, Supabase/Stripe clients
supabase/migrations/    # SQL schema + security migrations
data/                   # Static content (e.g., testimonials)
scripts/                # Utility scripts (seed users)
```

## Local Setup

### 1) Install dependencies

```bash
npm install
```

### 2) Create local environment file

```bash
cp .env.local.example .env.local
```

PowerShell alternative:

```powershell
Copy-Item .env.local.example .env.local
```

### 3) Configure Supabase and Stripe values

Fill `.env.local` using your project keys.

### 4) Apply database migrations

Run SQL migrations in order:

- `supabase/migrations/001_init.sql`
- `supabase/migrations/002_security_hardening.sql`
- `supabase/migrations/003_harden_function_search_path.sql`
- `supabase/migrations/004_property_privilege_guard.sql`
- `supabase/migrations/005_split_properties_listings.sql`
- `supabase/migrations/006_party_roles_audit_events.sql`
- `supabase/migrations/007_profiles_billing_fields.sql`
- `supabase/migrations/008_listing_status_machine.sql`
- `supabase/migrations/010_backfill_owner_party_roles.sql`
- `supabase/migrations/011_viewings.sql`
- `supabase/migrations/012_conversations_messages_inquiries.sql`
- `supabase/migrations/013_offers_applications_transactions.sql`
- `supabase/migrations/014_transaction_workspace.sql`
- `supabase/migrations/015_documents.sql`
- `supabase/migrations/016_payments_ledger_commission.sql`
- `supabase/migrations/017_decision_support_and_notifications.sql`
- `supabase/migrations/018_grant_default_privileges.sql`
- `supabase/migrations/019_analytics_funnel_and_audit.sql`

You can run them with Supabase CLI (`supabase db push`) or execute them in Supabase SQL Editor.

`018_grant_default_privileges.sql` grants the standard `anon`/`authenticated`/
`service_role` table privileges (`GRANT` + `ALTER DEFAULT PRIVILEGES`) that
hosted Supabase projects provision automatically outside of migrations — a
local `supabase start` instance doesn't reproduce that step, so without this
migration every table read/write fails with "permission denied" even though
RLS policies are correct. Safe to re-run against a hosted project (a no-op
there, since the grants already exist).

`009_drop_properties_legacy.sql` is **not** part of this routine list — it
drops the pre-split `properties` table kept as a rollback fence by
migration `005`. Only run it manually, after confirming the backfilled data
in `properties`/`listings` is correct and the app has run against it for a
full release cycle. Its own header comment has the full checklist.

Since migration `005`, the physical property and its market advertisement are
separate tables — `properties` (address, geo, bed/bath/area, media) and
`listings` (price, listing type, moderation/lifecycle status, featuring). The
app-facing `Property` type still exposes the old flattened shape for
backward compatibility; `id` on that shape is the listing id.

### 5) Seed demo users

```bash
npm run seed:users
```

### 6) Start the app

```bash
npm run dev
```

## Available Scripts

```bash
npm run dev         # Start dev server
npm run build       # Production build
npm run start       # Start production server
npm run lint        # Next.js lint
npm run seed:users  # Seed demo/admin/sample users in Supabase
npm run test:e2e    # Playwright + axe-core accessibility suite
```

## Environment Variables

### Required

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Stripe (optional for local development)

```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_MONTH=price_...
STRIPE_PRICE_PRO_QUARTER=price_...
STRIPE_PRICE_PRO_YEAR=price_...
STRIPE_PRICE_AGENCY_MONTH=price_...
STRIPE_PRICE_AGENCY_QUARTER=price_...
STRIPE_PRICE_AGENCY_YEAR=price_...
```

If Stripe is not configured, the `createCheckoutSessionAction` server action
returns a friendly error and the payment flow stays disabled — no route
handler is involved for checkout itself.

`STRIPE_WEBHOOK_SECRET` is required for the app to actually update
`profiles.plan` after a successful subscription payment (see
`app/api/webhooks/stripe/route.ts`). In local development, forward events to
it with the Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Without a configured webhook secret, checkout still works but the resulting
subscription never updates the user's plan automatically — only a manual
admin plan change does.

## Transaction Workspace (Offers, Documents, Payments)

Once an offer is accepted or a rental application is approved, a
`transactions` row is created with its own workspace at
`/dashboard/transactions/[id]` — see `supabase/migrations/013-016_*.sql`.

- **Documents & e-signature**: real Supabase Storage (private `documents`
  bucket, service-role-issued signed URLs — no bucket-level RLS policies
  are relied on). E-signature itself is **mocked** — no real vendor
  (DocuSign, Dropbox Sign, etc.) is integrated; signing is simulated
  entirely by database RPCs. See `lib/esign/`.
- **Payments**: a real Stripe integration reusing the existing
  `STRIPE_SECRET_KEY` — deposits are collected via a one-time Stripe
  Checkout session, the same pattern already used for subscriptions. This
  is **not** Stripe Connect: a collected deposit lands in the platform's own
  Stripe balance, described in the UI as "payment held by Stripe," never as
  escrow. Paying it out to the seller/landlord requires Stripe Connect
  (`STRIPE_CONNECT_CLIENT_ID`, not configured) — `transfers`/`payouts`
  tables exist but nothing writes to them yet.
- **Commission**: a configurable `commission_configs` table (platform
  default only today; per-agent overrides are schema-ready, unmanaged).
  Applied commission is copied onto the transaction once, so later config
  changes don't retroactively change an in-progress deal.
- **Regional rules**: `regional_rules`, seeded with Lebanon (`LB`)
  placeholder values only (e.g. suggested deposit min/max as a percent of
  offer price). Every seeded value is marked for legal review — it is not a
  compliance claim.

## Demo Accounts

After running `npm run seed:users`:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@othman.com` | `OthmanAdmin#6421!` |
| User | `user@othman.com` | `OthmanUser#6421!` |

The seed script also creates sample directory users with password:

- `OthmanSample#6421!`

## Authorization Model

- `dashboard` routes require authentication.
- `admin` routes require authenticated users with `role = admin` in `profiles`.
- Public users can view only approved properties; owners/admins can view and manage their own/internal records.

## API Surface

There is no general REST API. All reads/writes go through Next.js Server
Actions (`app/actions/*.ts`), called directly from Server/Client Components —
not fetched over HTTP. The only real HTTP route handler in the app is:

- `POST /api/webhooks/stripe` — Stripe webhook (unauthenticated by design;
  verified via `STRIPE_WEBHOOK_SECRET`). Handles both SaaS subscription
  events and transaction deposit/dispute events, disambiguated by Checkout
  session mode/metadata — see the route's comments.

Key server actions:

- `app/actions/properties.ts` — property/listing CRUD, save/sold toggles,
  admin moderation (approve/reject/feature/unfeature/delete)
- `app/actions/users.ts` — profile CRUD, admin user moderation (ban, plan
  change)
- `app/actions/checkout.ts` — create a Stripe subscription checkout session
- `app/actions/discovery.ts` — saved searches/alerts, property notes, hide/unhide

Two additional route handlers exist for scheduled work, neither wired to an
actual scheduler by default:

- `POST /api/cron/dispatch-search-alerts` — checks active saved-search
  alerts for new matching listings and notifies their owners. Dev-runnable
  manually (`curl -X POST .../api/cron/dispatch-search-alerts`); deploying
  this for real requires configuring a scheduler (Vercel Cron, Supabase
  scheduled function, etc.) to hit it on a cadence, and setting
  `CRON_SECRET` so only that scheduler can invoke it.

## Notifications

In-app only — no email/SMS. `notifications` rows are created directly, at
the point of the state change that causes them (offer submitted, viewing
confirmed, listing approved, etc. — see the relevant `app/actions/*.ts`
files and the Stripe webhook), not via an async queue. The bell in the
header polls every 60s; there's no realtime push.

## Decision Support

- **Saved searches**: persist filter state (`/properties` → "Save Search"),
  distinct from saved *properties* — different user intentions.
- **Compare**: client-side only (localStorage, up to 4 listings) — an
  ephemeral browsing tool, not a database table.
- **Notes**: private per-listing notes, visible only to their author.
- **Hide listing**: removes a listing from that one profile's own search
  results without deleting or affecting anyone else's view of it.

## Analytics & Audit Log

- `/admin/analytics` — summary cards, a **transaction funnel**
  (live listings → viewings → offers → transactions → closed) via
  `get_transaction_funnel()`, plus the pre-existing status/type/city/plan
  breakdowns. All backed by single-round-trip SQL RPCs
  (`supabase/migrations/005_split_properties_listings.sql`,
  `019_analytics_funnel_and_audit.sql`) — no N+1 queries.
- `/admin/audit-log` — searchable viewer over `audit_log`, filterable by
  entity type, action, and exact entity ID; actor names are resolved with
  one batched follow-up query per page, not per row. Every admin action
  that mutates a listing or a user account writes an entry here (see
  `app/actions/properties.ts` and `app/actions/users.ts`).

## Testing

`tests/e2e/accessibility.spec.ts` runs axe-core (`@axe-core/playwright`,
wcag2a/wcag2aa/wcag21aa rulesets) against the key public, authenticated, and
admin pages. Run with:

```bash
npx playwright install chromium   # first time only
npx playwright test
```

Requires a running dev server (`npm run dev`) against a local Supabase
instance with demo users (`npm run seed:users`) and at least one approved
listing seeded. No unit test suite exists yet.

## Notes

- `SYTEM-DESIGN.md` defines the UI design rules used across the app.
