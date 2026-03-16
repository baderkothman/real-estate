# Othman Real Estate

Lebanon's premier real estate platform — browse, list, buy, sell, and rent properties across Beirut and beyond.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Auth**: NextAuth v5 (Credentials provider)
- **Payments**: Stripe
- **Data**: In-memory mock store (no database)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

Create a `.env.local` file:

```env
AUTH_SECRET=your-secret-here

# Stripe (optional in dev — falls back to mock mode)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_PRO_MONTH=price_...
STRIPE_PRICE_PRO_QUARTER=price_...
STRIPE_PRICE_PRO_YEAR=price_...
STRIPE_PRICE_AGENCY_MONTH=price_...
STRIPE_PRICE_AGENCY_QUARTER=price_...
STRIPE_PRICE_AGENCY_YEAR=price_...
```

## Demo Accounts

| Role  | Email                  | Password   |
|-------|------------------------|------------|
| Admin | admin@othman.com       | admin123   |
| User  | user@othman.com        | user123    |

## Features

- **Property listings** — browse, search, and filter by city, type (sale/rent), and price range
- **User dashboard** — create and manage your own property listings
- **Saved properties** — bookmark listings for later
- **Subscription plans** — Free / Pro / Agency tiers with Stripe checkout
- **Admin panel** — approve/reject listings, manage users, view analytics
- **Featured listings** — paid promotion for boosted visibility

## Plans

| Plan   | Listings | Images/Listing | Price          |
|--------|----------|----------------|----------------|
| Free   | 3        | 5              | Free           |
| Pro    | 12       | 8              | $30/mo         |
| Agency | 100      | 20             | $60/mo         |

## Project Structure

```
app/          # Next.js App Router pages and API routes
components/   # UI components (ui/, layout/, property/, common/)
data/         # Mock seed data
hooks/        # Custom React hooks
lib/          # Auth, Stripe, constants, utilities
services/     # Business logic (in-memory data layer)
types/        # TypeScript types
```

## Commands

```bash
npm run dev     # Development server
npm run build   # Production build
npm run start   # Start production server
npm run lint    # ESLint
```
