# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (Next.js 15)
npm run build    # Production build
npm run lint     # ESLint check
npm run start    # Start production server
```

No test suite is configured.

## Architecture Overview

**Othman Real Estate** — a Lebanon-focused property listing platform (Next.js 15 App Router, TypeScript, Tailwind CSS).

### Data Layer (Mock / In-Memory)

This app uses **no database**. All data lives in module-level in-memory stores that reset on server restart:

- `data/mock-properties.ts` — seed data for properties
- `data/mock-users.ts` — seed data for users
- `services/property.service.ts` — in-memory `propertiesStore` array + `savedStore` Map
- `services/user.service.ts` — in-memory users store
- `services/analytics.service.ts` — derived analytics from in-memory data

When replacing with a real database, these service files are the only layer to change — all route handlers and components call service functions.

### Auth

NextAuth v5 (beta) with Credentials provider only. Auth config is in `lib/auth.ts`. The session extends with `role` (`user` | `admin`) and `plan` (`free` | `pro` | `agency`). Passwords are stored as plain strings in mock data (`passwordHash` field).

Middleware in `middleware.ts` protects `/dashboard/*` (requires any session) and `/admin/*` (requires `role === 'admin'`).

### Route Structure

```
app/
  page.tsx                  # Homepage
  properties/[id]/          # Public property detail
  pricing/                  # Pricing page
  about/
  auth/                     # Login / Register
  dashboard/                # Authenticated user area
    properties/             # User's own listings (create, edit)
    profile/
  admin/                    # Admin-only area
    properties/             # Approve/reject/feature listings
    users/                  # Ban/unban, change plans
    analytics/
  api/
    auth/[...nextauth]/     # NextAuth handler
    properties/             # GET list, POST create, [id] PATCH/DELETE
    users/                  # User CRUD
    admin/                  # Admin actions (approve, ban, feature)
    checkout/               # Stripe checkout session creation
```

### Plans & Billing

Three tiers: `free`, `pro`, `agency`. Limits and prices defined in `lib/constants.ts`. Stripe integration in `lib/stripe.ts` uses environment variables for price IDs (`STRIPE_PRICE_PRO_MONTH`, etc.). In dev, Stripe runs in mock mode if `STRIPE_SECRET_KEY` is not set.

### Component Organization

- `components/ui/` — shadcn/ui primitives (Button, Card, Dialog, Input, etc.)
- `components/layout/` — Header, Footer
- `components/property/` — PropertyCard, PropertyFilters, PropertyGallery
- `components/common/` — EmptyState, HeroSearch, Pagination, PlanBadge, SectionHeader
- `components/user/` and `components/auth/` — user-specific forms

### Styling

Dark theme by default (`<html class="dark">`). Background `#0d0c09`, text `#f0e6d0`. Tailwind CSS with shadcn/ui component conventions (`class-variance-authority`, `clsx`, `tailwind-merge` via `lib/utils.ts`).

## UI / Frontend Workflow

**Every UI or frontend edit MUST follow the design system defined in `SYTEM-DESIGN.md`.**

Key rules from that document:
- Warm off-white/vanilla cream backgrounds, deep charcoal text
- Primary CTA: `--brand` (`#fa6b05`), hover `--brand-hover` (`#c85604`)
- Secondary accent: `--accent` (`#379579`)
- Cards: white, `24px` radius, soft shadow, subtle border
- Typography: Playfair Display (headings) + Inter (body)
- 70/20/10 color balance — orange as accent only, not dominant

### Required steps for any UI change

1. **Invoke `/frontend-design`** before implementing — this skill generates production-grade, design-system-aligned code.
2. **Follow `SYTEM-DESIGN.md`** for tokens, spacing, radius, motion, and component patterns.
3. **Take a screenshot** after completing the change to visually verify it matches the intended design before committing.

## Environment Variables

```
AUTH_SECRET                     # NextAuth secret
STRIPE_SECRET_KEY               # Stripe secret (optional in dev)
STRIPE_PRICE_PRO_MONTH          # Stripe price IDs
STRIPE_PRICE_PRO_QUARTER
STRIPE_PRICE_PRO_YEAR
STRIPE_PRICE_AGENCY_MONTH
STRIPE_PRICE_AGENCY_QUARTER
STRIPE_PRICE_AGENCY_YEAR
```
