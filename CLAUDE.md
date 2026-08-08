# CLAUDE.md

This file provides repository-specific guidance to coding agents working in this project.

## Quick Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run db:migrate
```

Playwright accessibility tests are available but require a running local app
with migrated Neon data.

## Project Reality (Important)

- Auth is handled by Neon Auth, not NextAuth.
- Data is stored in Neon Postgres through the Neon Data API, not in-memory arrays.
- Core domain tables are `profiles`, `properties`, and `saved_properties`.
- Middleware and server routes enforce auth/role checks.

## Stack

- Next.js 16 App Router
- React 19 + TypeScript
- Tailwind CSS + shadcn/ui primitives
- Neon Postgres, Neon Data API, and Neon Auth
- Stripe subscriptions

## Architecture

### Neon Clients

- `lib/auth/server.ts`: Neon Auth server singleton.
- `lib/neon/server.ts`: request-scoped Data API client with Neon Auth token injection.
- `lib/neon/admin.ts`: trusted server Data API client for privileged operations.

Use server client for user-scoped actions and admin client only on trusted server paths.

### Services Layer

Route handlers are intentionally thin and call services:

- `services/property.service.ts`
- `services/user.service.ts`
- `services/analytics.service.ts`

When changing business rules, start in services first, then update route handlers/components.

### Auth and Authorization

- Use the server client auth facade for server-side auth checks.
- `/dashboard/*` requires an authenticated user.
- `/admin/*` requires authenticated user with `profiles.role = 'admin'`.
- Role is read from `profiles` (database source of truth), not trusted from client state.

### Property Lifecycle

- New properties are created with `status = 'pending'`.
- Public listing queries default to approved properties.
- Admin can approve/reject/feature/unfeature/delete properties.
- Owners can edit/delete their own properties; admins can manage all.

### Plans and Limits

- Plans: `free`, `pro`, `agency`.
- Limits/pricing are defined in `lib/constants.ts`.
- Listing-count limits are enforced in `POST /api/properties`.
- UI enforces image count based on plan during listing creation.

### Billing

- Stripe checkout is created in `app/api/checkout/route.ts`.
- Price mapping lives in `lib/stripe.ts`.
- If Stripe keys/price IDs are not configured, checkout responds with a friendly `503` error.

## Database and Migrations

The Neon-ready schema migration lives in `neon/migrations/0001_initial_schema.sql`.

Any schema or policy change should be implemented through a new migration.

## Frontend and Design System

For any UI change, follow `SYTEM-DESIGN.md`.

Key expectations:

- Warm neutral palette with orange brand accent.
- Playfair Display for display typography, Inter for body text.
- Soft cards, rounded corners, and subtle shadow treatment.
- Preserve the established visual language across pages.

## Development Notes

- Prefer path aliases (`@/`) over deep relative imports.
- Keep API handlers defensive (`401`/`403`/`404`/`500`) and explicit.
- Avoid exposing service-role logic to client components.
- Keep docs and env examples in sync when adding new configuration.

## Environment Variables

Required for core app behavior:

- `NEON_AUTH_BASE_URL`
- `NEON_AUTH_COOKIE_SECRET`
- `NEON_DATA_API_URL`
- `NEON_DATA_API_ADMIN_TOKEN`
- `DATABASE_URL` for manual migrations

Used for Stripe checkout:

- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_PRICE_PRO_MONTH`
- `STRIPE_PRICE_PRO_QUARTER`
- `STRIPE_PRICE_PRO_YEAR`
- `STRIPE_PRICE_AGENCY_MONTH`
- `STRIPE_PRICE_AGENCY_QUARTER`
- `STRIPE_PRICE_AGENCY_YEAR`

`STRIPE_WEBHOOK_SECRET` is present in env templates but there is currently no webhook route in this codebase.
