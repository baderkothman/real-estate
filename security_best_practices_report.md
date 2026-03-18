# Security Best Practices Report

## Remediation status (2026-03-18)

- Fixed in repo: SEC-001, SEC-002, SEC-003, and SEC-005.
- Upgraded beyond the originally recommended floor for SEC-004: `next` and `eslint-config-next` are now on `15.5.13`.
- Remaining dependency note: `npm audit` still reports one moderate `next/image` cache-growth advisory whose package-level fix is `next@16.1.7`; the in-repo mitigation applied here is `images.unoptimized = true` in `next.config.ts` to disable the vulnerable optimizer path until a major-version upgrade is planned.

## Executive summary

This Next.js + Supabase app has two direct privilege-escalation paths in the database layer, one unauthenticated admin-data exposure in the API layer, and one known critical framework vulnerability from an outdated Next.js version. The highest-priority work is to stop trusting client-controlled profile metadata for authorization, lock down profile updates so users cannot change privileged columns, protect the admin property feed, and upgrade Next.js to a patched release immediately.

## Critical

### SEC-001: Do not derive `role` or `plan` from user-controlled signup metadata

- Severity: Critical
- Location: `supabase/migrations/001_init.sql:66-78`
- Evidence:
  - `handle_new_user()` inserts `role` from `new.raw_user_meta_data->>'role'`
  - `handle_new_user()` inserts `plan` from `new.raw_user_meta_data->>'plan'`
  - Public signup exists in `app/auth/register/page.tsx:77-88`
- Impact:
  - Any anonymous user who signs up through Supabase can submit `role=admin` or `plan=agency` in signup metadata and get those values persisted into `public.profiles`.
  - All admin checks in app code read `profile.role`, so this becomes a full privilege escalation path.
- Why this is vulnerable:
  - Supabase documents that `raw_user_meta_data` is user-controlled and must not be used for authorization data.
- Recommended fix:
  - Hard-code `role` to `'user'` and `plan` to `'free'` in the trigger.
  - If privileged metadata is needed, store it in server-managed `raw_app_meta_data` or set it only from trusted backend code.

### SEC-002: Restrict profile updates so users cannot self-promote or unban themselves

- Severity: Critical
- Location: `supabase/migrations/001_init.sql:102-104`
- Evidence:
  - The update policy allows any user to update their own `profiles` row: `using (auth.uid() = id or public.is_admin())`
  - The browser initializes a public Supabase client in `lib/supabase/client.ts:3-6`
  - Sensitive authorization fields live in the same row: `role`, `plan`, `is_banned` in `supabase/migrations/001_init.sql:20-22`
- Impact:
  - Any authenticated user can issue a direct client-side update against their own `profiles` row and set `role='admin'`, upgrade `plan`, or clear `is_banned`.
  - This bypasses the server route sanitization because Supabase is reachable directly from the browser.
- Why this is vulnerable:
  - The policy checks row ownership, but it does not prevent changing privileged columns on that row.
- Recommended fix:
  - Remove direct client update capability for `profiles`, or split privileged fields into a separate table only writable by backend/admin code.
  - If self-service profile editing is required, expose only a server-side route that whitelists editable columns and lock the table down with stricter RLS.

## High

### SEC-003: Require admin authorization before serving the admin property feed

- Severity: High
- Location: `app/api/properties/route.ts:15-22`
- Evidence:
  - `admin=1` switches the route to `getAdminProperties(...)`
  - There is no auth check before returning the result
  - `getAdminProperties()` uses the service-role-backed admin client in `services/property.service.ts:436-472`
- Impact:
  - Any unauthenticated caller can request `/api/properties?admin=1` and enumerate pending, rejected, and featured listings, including owner metadata that should be limited to admins.
  - This bypasses the `/admin` page protection because the API route is reachable directly.
- Recommended fix:
  - Mirror the explicit admin check already used in `app/api/users/route.ts` before calling `getAdminProperties()`.
  - Treat all `admin=1` API branches as protected server-side code paths.

### SEC-004: Upgrade Next.js immediately to a patched release

- Severity: High
- Location: `package.json:22`
- Evidence:
  - The app is pinned to `next: "15.3.0"`
  - This repo uses the App Router (`app/` directory) and React Server Components
- Impact:
  - `15.3.0` is below the fixed `15.3.6` release for the official Next.js advisory `CVE-2025-66478` ("React2Shell"), which can lead to remote code execution in unpatched App Router deployments.
- Verification:
  - Verified against the official Next.js advisory published December 3, 2025: <https://nextjs.org/blog/CVE-2025-66478>
- Recommended fix:
  - Upgrade `next` and `eslint-config-next` to at least `15.3.6`, then rebuild and redeploy.
  - Because the advisory recommends it for previously exposed apps, rotate secrets after patching if the deployment was publicly reachable while vulnerable.

### SEC-005: Sanitize `callbackUrl` before passing it to `router.push`

- Severity: High
- Location: `app/auth/login/page.tsx:20,44`
- Evidence:
  - `callbackUrl` is read directly from the query string
  - That value is passed straight into `router.push(callbackUrl)`
- Impact:
  - An attacker can send a victim to `/auth/login?callbackUrl=javascript:...` or another untrusted destination, and the value is used after successful login.
  - Next.js explicitly warns that unsanitized URLs passed to `router.push` can create XSS.
- Verification:
  - Verified against the official `useRouter` docs: <https://nextjs.org/docs/app/api-reference/functions/use-router>
- Recommended fix:
  - Allow only same-site relative paths such as values that start with a single `/`.
  - Fall back to a safe default like `/dashboard/profile` when the value is missing or invalid.

## Follow-up recommendations

- Add rate limiting for `app/auth/login/page.tsx`, `app/auth/register/page.tsx`, and `app/api/checkout/route.ts` to reduce abuse and credential stuffing impact.
- Review whether `profiles_select_all` in `supabase/migrations/001_init.sql:99-100` intentionally exposes email and phone data to all visitors.
- Confirm CSP, `X-Content-Type-Options`, clickjacking protection, and `Referrer-Policy` are set at the edge if they are not managed in application code.
