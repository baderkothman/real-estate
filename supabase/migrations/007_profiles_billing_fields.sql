-- Closes the unclosed Stripe billing loop: `createCheckoutSessionAction`
-- creates a real subscription checkout session, but nothing previously
-- persisted the Stripe customer/subscription identifiers, so no webhook
-- could correlate future subscription lifecycle events (renewal, plan
-- change, cancellation) back to a profile. `profiles.plan` was only ever
-- updated by a manual admin override.
--
-- These columns are written exclusively by the service-role client from the
-- new Stripe webhook handler (app/api/webhooks/stripe/route.ts) — no RLS
-- policy grants end users direct write access to them.

alter table public.profiles
  add column stripe_customer_id text unique,
  add column stripe_subscription_id text;

create index idx_profiles_stripe_customer_id on public.profiles(stripe_customer_id);
