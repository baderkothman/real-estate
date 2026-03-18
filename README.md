# Othman Real Estate

Lebanon-focused real estate marketplace built with Next.js, Supabase, and Stripe.

## Tech Stack

- Framework: Next.js 15 App Router
- Language: TypeScript
- Styling: Tailwind CSS with shadcn/ui primitives
- Auth: Supabase Auth
- Data: Supabase-backed profiles, properties, saves, and admin flows
- Payments: Stripe subscriptions

## Getting Started

```bash
npm install
cp .env.local.example .env.local
```

Fill in the Supabase values in `.env.local`, then seed the local demo users:

```bash
npm run seed:users
npm run dev
```

Open the local URL printed by Next.js. If port `3000` is already in use, Next.js will automatically choose the next available port.

## Required Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

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

If Stripe keys are missing, checkout stays in demo mode and the pricing flow returns a friendly configuration message.

## Demo Accounts

After running `npm run seed:users`:

| Role  | Email             | Password |
|-------|-------------------|----------|
| Admin | admin@othman.com  | OthmanAdmin#6421! |
| User  | user@othman.com   | OthmanUser#6421! |

The seed script also creates a directory of sample public users. Their shared password is `OthmanSample#6421!`.

## Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run seed:users
```
