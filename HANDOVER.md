# Hexlura — Developer Handover Document

**Platform**: Full-stack event ticketing and booking platform  
**Stack**: Next.js 14 (App Router) · TypeScript · Supabase · Stripe · Resend · Tailwind CSS  
**Repo**: [github.com/codesbaylab/hexlura](https://github.com/codesbaylab/hexlura)

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Environment Variables](#2-environment-variables)
3. [Architecture Overview](#3-architecture-overview)
4. [User Roles & Access Control](#4-user-roles--access-control)
5. [Route Structure](#5-route-structure)
6. [Database Schema](#6-database-schema)
7. [Key Flows](#7-key-flows)
8. [Third-Party Services](#8-third-party-services)
9. [Email System](#9-email-system)
10. [API Routes](#10-api-routes)
11. [Stripe Webhooks](#11-stripe-webhooks)
12. [QR Check-In System](#12-qr-check-in-system)
13. [Cron Jobs](#13-cron-jobs)
14. [Known Issues & TODOs](#14-known-issues--todos)
15. [Deployment](#15-deployment)

---

## 1. Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project (database + auth)
- A Stripe account (with webhooks configured)
- A Resend account (for emails)

### Install & Run

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # production build
npm run start     # production server
npm run lint      # ESLint check
```

### First-Time Setup

1. Copy `.env.local.example` to `.env.local` and fill in all values (see [Section 2](#2-environment-variables))
2. Apply Supabase migrations: run all files in `supabase/migrations/` in order against your project
3. Create an admin user in Supabase:
   - Add a user in `auth.users`
   - Insert into `profiles` with `role = 'admin'`
4. Configure Stripe webhooks to point to `/api/webhooks/stripe`
5. Run `npm run build` to confirm no errors

---

## 2. Environment Variables

Create a `.env.local` file in the project root. **Never commit this file.**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_IDENTITY_FLOW_ID=vf_...
STRIPE_CONNECT_CLIENT_ID=ca_...       # Optional — only if using Stripe Connect payouts

# Resend (email)
RESEND_API_KEY=re_...

# App
NEXT_PUBLIC_APP_URL=https://hexlura.com
NEXT_PUBLIC_SITE_URL=https://www.hexlura.com
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-...   # Google Analytics (optional)

# Security
PROMOTER_CLICK_SALT=random-secret-string   # Salt for promoter link hash tracking
CRON_SECRET=random-secret-string           # Bearer token for Vercel cron jobs
ADMIN_SECRET=random-secret-string          # Admin endpoint authentication token
```

---

## 3. Architecture Overview

```
Browser / Mobile
      │
      ▼
Next.js 14 (App Router)
  ├── Server Components (data fetching, SSR)
  ├── Client Components (interactivity)
  ├── API Routes (business logic, Stripe, emails)
  └── Middleware (session refresh, role-based routing)
      │
      ├── Supabase (PostgreSQL + Auth + RLS)
      ├── Stripe (Payments + Connect + Identity)
      └── Resend (Transactional Emails via React Email)
```

### Supabase Client Types

Three separate clients are used — using the wrong one is a common source of bugs:

| Client | File | Key Used | Bypasses RLS | When to Use |
|---|---|---|---|---|
| `createClient()` | `lib/supabase/server.ts` | Anon key | No | Auth checks, user's own data |
| `createServiceClient()` | `lib/supabase/service.ts` | Service role | Yes | Organiser pages reading `organiser_profiles` |
| `createAdminClient()` | `lib/supabase/admin.ts` | Service role | Yes | All admin pages and `/api/admin/*` routes |

**Pattern to follow in every admin/organiser API route:**

```typescript
// Step 1: Auth check with anon client
const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

// Step 2: All DB queries with admin client
const adminClient = createAdminClient()
const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
```

### Monetary Values

All prices are stored as **integers in pence** (GBP). Convert at display time only.

```typescript
// Store
price_pence: 1050  // = £10.50

// Display
`£${(price_pence / 100).toFixed(2)}`
```

### Platform Fee

Fee is **paid by the buyer on top of the ticket price**. Organisers receive 100% of their ticket price.

```typescript
// Default config (lib/fees.ts) — all values admin-configurable via platform_settings
DEFAULT_FEE_CONFIG = {
  percent: 5,       // 5% of ticket price
  minPence: 99,     // minimum £0.99 per ticket
  maxPence: 500,    // maximum £5.00 per ticket
}

// Load live config (server-side only)
const config = await getFeeConfig()
const fee = calculateBookingFeePerTicket(ticketPricePence, config)
```

Fee is stored in `bookings.fee_pence`. Organiser payout = ticket revenue only (fee goes to platform).

---

## 4. User Roles & Access Control

The platform has 5 roles enforced at both middleware and database (RLS) levels:

| Role | Access |
|---|---|
| `user` | Own bookings, account, checkout |
| `organiser` | Own events, attendees, payouts, analytics |
| `promoter` | Own referral links, earnings, payouts |
| `admin` | All data platform-wide |
| `door_staff` | Check-in only (set via `organiser_team` table, not `profiles.role`) |

### Middleware Protection

`middleware.ts` → `lib/supabase/middleware.ts`

| Path | Requires | Redirects To |
|---|---|---|
| `/admin/*` | `role = admin` | `/auth/login` |
| `/organiser/*` | `role = organiser` or organiser team | `/organiser/pending` |
| `/promoter/*` | `role = promoter` | `/promoter/apply` |
| `/account`, `/bookings`, `/checkout` | Any authenticated user | `/auth/login` |
| `/checkin/*` | door_staff / organiser / admin | `/checkin/login` |
| `/auth/login`, `/auth/register` | Unauthenticated | Redirects to dashboard if already logged in |

---

## 5. Route Structure

```
app/
├── (public)/                     Public site
│   ├── page.tsx                  Home (hero, categories, events)
│   ├── events/                   Browse & event detail
│   ├── organisers/[slug]/        Public organiser profiles
│   ├── about/, how-it-works/     Static pages
│   └── ...
│
├── auth/                         Authentication
│   ├── login/, register/
│   ├── verify/, reset-password/
│   └── actions.ts                Server actions (signin, signout, reset)
│
├── (user)/                       Logged-in customer
│   ├── account/                  Profile & settings
│   ├── bookings/                 Booking list + detail + PDF
│   ├── checkout/                 Multi-step checkout + success
│   ├── favourites/
│   ├── notifications/
│   └── support/
│
├── (organiser-open)/             Organiser registration
│   └── organiser/apply/pending/
│
├── (organiser)/organiser/        Organiser dashboard
│   ├── page.tsx                  Dashboard (KPIs, revenue chart)
│   ├── events/                   Create, edit, manage events
│   ├── attendees/                Cross-event attendee view
│   ├── bookings/                 Bookings for organiser's events
│   ├── analytics/                Revenue & ticket breakdown
│   ├── payouts/                  Payout history & withdrawals
│   ├── refunds/                  Refund request management
│   ├── team/                     Door staff & team management
│   ├── promoters/                Promoter invites & commission
│   ├── portfolio/                Public profile editing
│   ├── support/
│   └── settings/                 Stripe Connect, bank details, identity
│
├── (promoter)/promoter/          Promoter dashboard
│   ├── page.tsx                  Dashboard (earnings, clicks)
│   ├── links/                    Referral links
│   ├── events/                   Events available to promote
│   ├── payouts/
│   └── settings/
│
├── (admin)/admin/                Admin panel
│   ├── page.tsx                  Dashboard KPIs
│   ├── users/                    User management
│   ├── organisers/               Approve/reject/suspend
│   ├── promoters/
│   ├── events/                   Feature, delist, cancel
│   ├── bookings/
│   ├── payouts/                  Organiser + promoter payouts
│   ├── refunds/
│   ├── financials/               Revenue breakdown
│   ├── categories/ & cities/     Content management
│   ├── seo/                      SEO metadata
│   ├── audit-log/
│   ├── support/
│   └── settings/                 Platform settings, promo codes
│
└── api/                          API routes (see Section 10)
```

---

## 6. Database Schema

32 tables total. Full schema in `supabase/migrations/`.

### Core Tables

| Table | Purpose |
|---|---|
| `profiles` | User accounts (role, referral_code, credit_balance) |
| `organiser_profiles` | Organiser accounts (stripe_account_id, VAT, identity status) |
| `organiser_team` | Team members with privilege: organiser or door_staff |
| `events` | Events (title, slug, category, venue, status: draft/published/cancelled/archived) |
| `ticket_types` | Ticket tiers per event (price_pence, quantity_total, quantity_sold, sale windows) |

### Bookings & Payments

| Table | Purpose |
|---|---|
| `bookings` | Booking records (status: pending/confirmed/refunded/cancelled, stripe_payment_intent_id) |
| `booking_items` | Individual tickets per booking (qr_code UUID, attendee_name, unit_price_pence) |
| `reservations` | Ticket holds during checkout (status: active/confirmed) |
| `promo_codes` | Discount codes (percent or fixed, usage limits) |
| `refund_requests` | Customer refund workflow |
| `checkins` | QR scan records (booking_item_id, checked_in_by, timestamp) |

### Payouts

| Table | Purpose |
|---|---|
| `payouts` | Organiser payouts (status: pending/requested/processing/paid/failed, stripe_transfer_id) |
| `promoter_profiles` | Promoter accounts (referral_code, payout_method) |
| `promoter_event_assignments` | Organiser → promoter invites (commission_percent, status) |
| `promoter_link_clicks` | Referral click tracking (ip_hash, is_unique) |
| `promoter_earnings` | Commission ledger per booking (status: pending/available/paid/reversed) |
| `promoter_payouts` | Promoter payout records |

### Support & Admin

| Table | Purpose |
|---|---|
| `notifications` | In-app notifications |
| `support_tickets` | Support tickets |
| `support_messages` | Support ticket replies |
| `audit_logs` | Admin action trail |
| `platform_settings` | Global config |
| `seo_metadata` | Per-page SEO metadata |
| `categories` | Event categories (with images) |
| `cities` | Event cities (with images) |

### Database Triggers

| Trigger | On | Effect |
|---|---|---|
| `on_auth_user_created` | `auth.users` insert | Creates row in `profiles` |
| `on_booking_insert` | `bookings` insert | Generates `HXL-XXXXXX` booking reference |
| `on_profile_insert` | `profiles` insert | Generates unique referral code |
| `support_tickets_set_updated_at` | `support_tickets` update | Keeps `updated_at` current |

### RPC Functions

| Function | Purpose |
|---|---|
| `increment_quantity_sold(ticket_type_id, quantity)` | Atomic ticket availability decrement — prevents overselling |

---

## 7. Key Flows

### Checkout & Booking

1. User selects ticket types on event page → ticket availability checked
2. Attendee details collected, promo code validated
3. `POST /api/checkout/create-intent` → creates Stripe `PaymentIntent` with metadata (event_id, ticket selections, promoter tracking, promo code)
4. User completes payment via Stripe Elements
5. Stripe fires `payment_intent.succeeded` webhook
6. Webhook handler (`/api/webhooks/stripe`) creates `bookings` + `booking_items` rows, decrements `ticket_types.quantity_sold`, sends confirmation email
7. Frontend redirects to `/checkout/success`

### Organiser Payout

1. Event ends → cron job marks event as `archived`, generates `payouts` row (status: pending)
2. Organiser requests withdrawal via `/organiser/payouts`
3. Admin reviews in `/admin/payouts`, clicks "Process"
4. `POST /api/admin/payouts/[id]/process` → creates Stripe transfer to organiser's connected account
5. Stripe fires `transfer.failed` webhook if it fails → admin notified

### Organiser Approval

1. Organiser submits application via `/organiser/apply`
2. Admin reviews in `/admin/organisers`
3. Admin approves → `organiser_profiles.status` set to `approved`, welcome email sent
4. Organiser can now access `/organiser/*` dashboard

### Refund Request

1. User requests refund from `/bookings/[ref]` (eligibility checked against event's refund policy)
2. `refund_requests` row created (status: pending)
3. Admin approves in `/admin/refunds` → Stripe refund issued, booking status updated, ticket inventory restored

---

## 8. Third-Party Services

| Service | SDK | Purpose |
|---|---|---|
| **Supabase** | `@supabase/ssr` `@supabase/supabase-js` | Database, auth, RLS |
| **Stripe** | `stripe` `@stripe/react-stripe-js` | Payments, Connect payouts, Identity verification |
| **Resend** | `resend` | Transactional email delivery |
| **React Email** | `react-email` `@react-email/components` | Email template rendering |
| **TipTap** | `@tiptap/react` | Rich text editor for event descriptions |
| **Recharts** | `recharts` | Analytics charts |
| **QR Code** | `qrcode.react` `html5-qrcode` | QR generation + scanning for check-in |
| **Vercel Analytics** | `@vercel/analytics` | Page analytics |

---

## 9. Email System

Emails are sent via **Resend** using **React Email** templates. All 17 templates are in `/emails/`:

| Template | Sent When |
|---|---|
| `booking-confirmation.tsx` | Booking confirmed after payment |
| `new-booking-organiser.tsx` | Organiser notified of new booking |
| `event-cancelled.tsx` | Event is cancelled |
| `event-published.tsx` | Organiser publishes an event |
| `organiser-welcome.tsx` | Organiser application approved |
| `organiser-identity-verified.tsx` | Identity verification completed |
| `payout-paid-organiser.tsx` | Organiser payout processed |
| `payout-failed-admin.tsx` | Stripe transfer failed (admin alert) |
| `promoter-welcome.tsx` | Promoter account created |
| `promoter-invite.tsx` | Organiser invites a promoter |
| `payout-paid-promoter.tsx` | Promoter payout processed |
| `refund-request-organiser.tsx` | Refund request status update |
| `refund-admin-review.tsx` | Admin review needed for refund |
| `announcement.tsx` | Platform-wide announcement |
| `user-welcome.tsx` | New user registered |
| `email-verification.tsx` | Email verification (reference; Supabase handles actual send) |
| `password-reset.tsx` | Password reset link |

All templates share `emails/components/BaseEmail.tsx` as a wrapper.

**Note**: If `RESEND_API_KEY` is not set, emails will silently fail. Always verify the key is configured.

---

## 10. API Routes

All under `app/api/`:

| Prefix | Purpose |
|---|---|
| `/api/checkout/` | Payment intent creation, booking confirmation, comp ticket validation |
| `/api/webhooks/stripe` | Stripe webhook handler (payment success/fail, transfers, identity) |
| `/api/tickets/[ref]/pdf` | Generate PDF ticket with QR code |
| `/api/checkin/` | QR scan endpoint + booking lookup |
| `/api/organiser/` | Events, payouts, comp codes, team, promoters, refunds |
| `/api/admin/` | User/organiser/event management, payouts, refunds, exports, settings |
| `/api/promoter/` | Signup, invite acceptance, click tracking, payouts |
| `/api/bookings/` | Booking creation, complimentary tickets |
| `/api/events/` | Event CRUD, duplication |
| `/api/support/` | Ticket creation + replies |
| `/api/notifications/` | Mark as read |
| `/api/stripe/` | Stripe Connect onboarding flow |
| `/api/cron/` | Scheduled jobs (event status updates, payout generation) |
| `/api/promo/validate` | Promo code validation at checkout |
| `/api/likes/` `/api/follows/` `/api/reviews/` | Social features |
| `/api/waitlist/` `/api/reservations/` | Waitlist + ticket holds |

---

## 11. Stripe Webhooks

**Handler file**: `app/api/webhooks/stripe/route.ts`

Configure in Stripe Dashboard → Webhooks → point to `https://yourdomain.com/api/webhooks/stripe`

**Events to enable:**

| Event | What Happens |
|---|---|
| `payment_intent.succeeded` | Creates booking + booking_items, sends confirmation email, tracks promoter earnings |
| `payment_intent.payment_failed` | Cancels booking, restores ticket inventory |
| `transfer.failed` | Marks payout as failed, alerts admin |
| `account.updated` | Logs Stripe Connect account status |
| `identity.verification_session.verified` | Marks organiser identity as verified, enables payouts |
| `identity.verification_session.requires_input` | Notifies organiser to retry verification |
| `identity.verification_session.canceled` | Marks identity session as canceled |

**Idempotency**: The handler uses `stripe_payment_intent_id` to prevent duplicate bookings on Stripe retries.

---

## 12. QR Check-In System

**How it works:**

1. Each `booking_item` has a unique `qr_code` UUID generated at booking time
2. PDF ticket encodes this UUID as a QR code
3. Door staff opens `/organiser/events/[id]/checkin/` on any device
4. Scanner (`html5-qrcode`) reads the QR code
5. `POST /api/checkin` validates and records the check-in

**Response codes from check-in API:**

| Code | Meaning |
|---|---|
| `SUCCESS` | Valid scan, check-in recorded |
| `ALREADY_SCANNED` | Ticket already used |
| `INVALID` | QR code not found |
| `WRONG_EVENT` | Ticket is for a different event |
| `CANCELLED` | Booking or event is cancelled |
| `TOO_EARLY` | Check-in window not open yet |
| `EVENT_ENDED` | Event has ended |
| `CANCELLED_TICKET` | Ticket was refunded |

**Access**: Only users with `organiser`, `admin`, or `door_staff` privilege (via `organiser_team`) can scan.

---

## 13. Cron Jobs

Located in `app/api/cron/`. Protected by `CRON_SECRET` bearer token.

Configure in `vercel.json` for automatic scheduling. Jobs handle:
- Marking events as `ended` / `archived` after their end time
- Generating `payouts` rows for completed events
- Expiring old ticket reservations

---

## 14. Known Issues & TODOs

| Area | Status |
|---|---|
| Stripe Connect payout transfers | Code complete, requires live Stripe account testing |
| `STRIPE_CONNECT_CLIENT_ID` | Optional — only needed if enabling Stripe Connect for organisers |
| React hook dependency warnings | Pre-existing, no functional impact |
| Button/Card component responsive variants | Minor polish, low priority |

---

## 15. Deployment

The project is built for **Vercel** deployment.

### Checklist Before Going Live

- [ ] All environment variables set in Vercel project settings
- [ ] Supabase migrations applied to production database
- [ ] Stripe webhook endpoint registered pointing to production URL
- [ ] `STRIPE_WEBHOOK_SECRET` updated with production webhook secret
- [ ] Cron jobs configured in `vercel.json` with correct `CRON_SECRET`
- [ ] `NEXT_PUBLIC_APP_URL` set to production domain
- [ ] Admin user created in Supabase
- [ ] `npm run build` passes with no errors

### Verify After Deploy

- [ ] User can register and log in
- [ ] Event browsing works
- [ ] Checkout flow completes (use Stripe test card `4242 4242 4242 4242`)
- [ ] Booking confirmation email arrives
- [ ] Organiser can create an event
- [ ] Admin panel shows data at `/admin`
- [ ] QR check-in works on a mobile device

---

*Last updated: May 2026 — See `CLAUDE.md` for architectural decisions and recent bug fixes.*
