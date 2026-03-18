# UI QA Report

Date: 2026-03-18
Environment: local Next.js dev server on `http://127.0.0.1:3001`
Scope: desktop and mobile smoke/functional pass across public routes, auth flows, and protected-route redirects

## Tested Routes

- `/`
- `/properties`
- `/properties/[id]`
- `/users`
- `/users/[id]`
- `/pricing`
- `/about`
- `/auth/login`
- `/auth/register`
- `/dashboard/profile` (redirect behavior only)
- `/admin` (redirect behavior only)
- Footer and auth-linked routes: `/privacy`, `/terms`, `/auth/forgot-password`

## Main Blocker

Authenticated dashboard and admin behavior could not be fully verified because the current auth flow is not usable from the documented demo credentials, and new signup did not produce an immediately usable session.

## Findings

### 1. High: Auth onboarding is broken or out of sync

Observed:
- `admin@othman.com / admin123` failed on the live login form.
- New signup created an account but then dropped the user back to login without a usable session.
- The signup page still tries to auto-login even when confirmation appears to be required.

Evidence:
- `app/auth/login/page.tsx`
- `app/auth/register/page.tsx`
- `README.md`

Recommended fix:
- Handle the "email confirmation required" path explicitly after signup.
- Do not auto-login immediately unless confirmation is not required.
- Reseed or update the documented demo accounts so README matches actual behavior.

### 2. High: Dead links in the auth and footer flows

Observed:
- `/auth/forgot-password` returns 404.
- `/privacy` returns 404.
- `/terms` returns 404.

Evidence:
- `app/auth/login/page.tsx`
- `app/auth/register/page.tsx`
- `components/layout/footer.tsx`

Recommended fix:
- Add these pages, or remove the links until the routes exist.

### 3. Medium: Public pages generate avoidable console errors

Observed:
- Public pages trigger `/api/me` as a guest and receive `401 Unauthorized`.
- This makes the console look broken even when the page itself renders correctly.

Affected pages observed live:
- `/`
- `/properties`
- `/users`
- `/pricing`
- `/about`

Evidence:
- `components/providers/supabase-provider.tsx`
- `app/api/me/route.ts`

Recommended fix:
- Avoid calling `/api/me` for anonymous visitors, or
- Return a non-error guest response instead of `401` for the initial unauthenticated state.

### 4. Medium: Placeholder/internal copy is leaking into the UI

Observed live:
- `IconSearch`
- `IconSearch Properties`
- `Go IconHome`

Observed in source and likely visible in gated screens:
- `IconPhoto`
- `IconCheck back soon!`

Evidence:
- `components/common/hero-search.tsx`
- `components/property/property-filters.tsx`
- `app/users/page.tsx`
- `app/not-found.tsx`
- `app/dashboard/properties/create/page.tsx`
- `app/dashboard/properties/[id]/edit/page.tsx`
- `app/properties/page.tsx`

Recommended fix:
- Replace with user-facing copy such as:
  - `Search`
  - `Search Properties`
  - `Go Home`
  - `Photos`
  - `Check back soon`

### 5. Medium: Save-property flow redirects poorly for logged-out users

Observed:
- Clicking the heart/save action while logged out first hits the API, then fails with `401`, then redirects to plain `/auth/login`.
- The redirect does not preserve the current page as a callback target.

Evidence:
- `hooks/use-save-property.ts`

Recommended fix:
- Redirect logged-out users directly to `/auth/login?callbackUrl=<current route>` before calling the save endpoint, or preserve the originating property route during redirect.

### 6. Low: Metadata/title coverage is inconsistent

Observed:
- `/about`, `/properties`, and `/users` had route-specific browser titles.
- `/pricing`, `/auth/login`, and `/auth/register` used the generic app title.

Evidence:
- `app/about/page.tsx`
- `app/properties/page.tsx`
- `app/users/page.tsx`
- `app/pricing/page.tsx`
- `app/auth/login/page.tsx`
- `app/auth/register/page.tsx`

Recommended fix:
- Add route metadata exports for pricing and auth pages so browser titles match the page content.

### 7. Low: README is stale relative to the app

Observed:
- README still says `NextAuth v5` and `in-memory mock store`.
- README advertises demo accounts that do not match the live app behavior.

Evidence:
- `README.md`

Recommended fix:
- Update the setup and auth sections to reflect the Supabase-based implementation and the actual local/demo login path.

## Appearance and UX Notes

- Overall visual direction is strong and consistent.
- Mobile navigation rendered correctly and the main public pages remained usable on a narrow viewport.
- The most visible polish issues were copy leakage and dead-link routes, not layout collapse.

## Recommended Fix Order

1. Fix signup/login flow and align demo credentials with the actual environment.
2. Add or remove dead linked pages: forgot password, privacy, terms.
3. Stop guest `/api/me` calls from producing console errors on public pages.
4. Clean up placeholder/internal copy strings across public and dashboard screens.
5. Improve logged-out save-property redirect behavior.
6. Add missing page metadata.
7. Update README to match the current architecture and auth flow.

## Verification Status

Verified live:
- Public route rendering
- Public search/filter basics
- Property detail access
- User directory pagination
- Protected-route redirects for dashboard/admin
- Dead-link behavior for footer/auth links
- Mobile navigation presence and basic usability

Not fully verified due auth blocker:
- Authenticated dashboard flows
- Admin management flows
- Listing create/edit submission flows
- Stripe checkout beyond login redirect behavior
