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

You can run them with Supabase CLI (`supabase db push`) or execute them in Supabase SQL Editor.

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

If Stripe is not configured, `/api/checkout` returns a friendly `503` message and payment flow stays disabled.

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

## Selected API Endpoints

- `GET /api/properties` - public listing feed with filters
- `POST /api/properties` - create property (auth required, plan limits enforced)
- `GET /api/properties/:id` - fetch property details
- `PUT /api/properties/:id` - update property (owner or admin)
- `DELETE /api/properties/:id` - delete property (owner or admin)
- `POST /api/properties/:id/save` - toggle save (auth required)
- `POST /api/properties/:id/sold` - toggle sold (owner only)
- `GET /api/users` - public user directory
- `GET /api/users?admin=1` - admin user list
- `POST /api/checkout` - create Stripe checkout session

## Notes

- There is currently no automated test suite.
- `SYTEM-DESIGN.md` defines the UI design rules used across the app.
