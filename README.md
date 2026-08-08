# Othman Real Estate

Lebanon-focused real estate marketplace built with Next.js, Neon, and Stripe.

## What This App Includes

- Public property browsing with filtering by city, type, price, and search
- Property detail pages with owner contact info for signed-in users
- Neon Auth email/password flows for register, login, logout, and password reset
- User dashboard for creating, editing, and tracking listings
- Saved properties, saved searches, notes, notifications, offers, applications, transactions, and documents
- Admin panel for property moderation, user management, audit logs, and analytics
- Stripe subscription checkout and transaction payment records

## Tech Stack

- Framework: Next.js 16 App Router
- Language: TypeScript
- Styling: Tailwind CSS + shadcn/ui primitives
- Auth: Neon Auth
- Database: Neon Postgres through the Neon Data API
- Billing: Stripe

## Project Structure

```text
app/                    # Routes, pages, layouts, API handlers
components/             # UI and feature components
services/               # Business/data access layer
lib/                    # Shared utilities, auth, Neon, and Stripe clients
neon/migrations/        # Neon SQL schema migrations
data/                   # Static content
tests/e2e/              # Playwright accessibility tests
```

## Local Setup

```bash
npm install
cp .env.example .env.local
```

Set the required Neon and Stripe values in `.env.local`, then apply the schema
to your own Neon database:

```bash
npm run db:migrate
npm run dev
```

See `NEON_MIGRATION.md` for the manual database migration and optional existing
data migration procedure.

## Available Scripts

```bash
npm run dev         # Start dev server
npm run build       # Production build
npm run start       # Start production server
npm run lint        # Biome lint/check for app source
npm run typecheck   # TypeScript check
npm run db:migrate  # Manually apply Neon schema using DATABASE_URL
npm run test:e2e    # Playwright + axe-core accessibility suite
```

## Environment Variables

### Required

```env
NEON_AUTH_BASE_URL=https://your-neon-auth-url/YOUR_DB/auth
NEON_AUTH_COOKIE_SECRET=generate-with-openssl-rand-base64-32
NEON_DATA_API_URL=https://your-neon-data-api-url/rest/v1
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
```

`DATABASE_URL` (the `neondb_owner` connection) is used both for manual
migrations and, at runtime, by `lib/neon/admin.ts` — its BYPASSRLS privilege
is what gives trusted server paths (audit log, admin user management,
payment webhooks, analytics) privileged access, rather than a Data API admin
bearer token.

### Stripe

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

`STRIPE_WEBHOOK_SECRET` is required for subscription and transaction payment
state to sync from Stripe. For local development, forward events with:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Authorization Model

- `/dashboard/*` routes require authentication.
- `/admin/*` routes require authenticated users with `role = admin` in `profiles`.
- Public users can view only approved properties.
- Owners and admins can view and manage their own/internal records according to server-side service checks.

## Transaction Workspace

Accepted offers and approved rental applications create transaction workspaces
at `/dashboard/transactions/[id]`. Documents and e-signature records are stored
in the database schema, but no external file-storage provider is configured in
this repository after the Neon migration.

## Testing

`tests/e2e/accessibility.spec.ts` runs axe-core against key public,
authenticated, and admin pages.

```bash
npx playwright install chromium
npm run test:e2e
```

The e2e suite requires a running dev server and a Neon database with usable
test users and at least one approved listing.
