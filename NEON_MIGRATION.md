# Neon Migration Guide

This repository is prepared for Neon Postgres, Neon Data API, and Neon Auth
(Managed Better Auth). The agent did not run any remote database migrations,
export production data, import production data, or create production users.

## Required setup

1. Create or select a Neon project.
2. Enable Managed Better Auth.
3. Enable the Neon Data API and configure it with Managed Better Auth.
4. Configure trusted auth domains for local, preview, and production URLs.
5. Copy runtime values into `.env.local` and Vercel environment variables.

## Local environment

Copy `.env.example` to `.env.local`, then set:

- `NEON_AUTH_BASE_URL`
- `NEON_AUTH_COOKIE_SECRET`
- `NEON_DATA_API_URL`
- `NEON_DATA_API_ADMIN_TOKEN`
- `DATABASE_URL`
- Stripe variables

Generate a cookie secret with:

```bash
openssl rand -base64 32
```

## Database migration commands

Use the direct, non-pooled Neon connection string for migrations.

```bash
npm install

# Inspect before applying.
less neon/migrations/0001_initial_schema.sql

# Apply manually to Neon.
DATABASE_URL='postgresql://USER:PASSWORD@HOST/DB?sslmode=require&channel_binding=require' npm run db:migrate

# Verify core tables.
psql "$DATABASE_URL" -c "\\dt public.*"
psql "$DATABASE_URL" -c "select id, email, name, role, plan from public.profiles limit 5;"
```

## Optional existing data migration

Do not migrate data until the Neon schema has been applied and validated.
Preserve UUIDs and timestamps during export/import.

Recommended table order:

1. Auth users, using a supported Neon Auth migration or user
   re-registration strategy. Password hashes from the previous auth provider
   cannot be directly migrated to Managed Better Auth.
2. `profiles`
3. `properties`
4. `listings`
5. `saved_properties`, `party_roles`
6. `viewings`, `conversations`, `conversation_participants`, `messages`,
   `inquiries`
7. `offers`, `offer_revisions`, `rental_applications`, `transactions`,
   `transaction_tasks`
8. `documents`, `document_signers`
9. `payment_intents`, `payments`, `refunds`, `transfers`, `payouts`,
   `disputes`, `ledger_entries`
10. `saved_searches`, `search_alerts`, `property_notes`, `hidden_listings`,
    `notifications`, `audit_log`, `events`

Validate row counts, foreign-key integrity, sample user-owned records, admin
access, and critical user flows before cutting over production traffic.
