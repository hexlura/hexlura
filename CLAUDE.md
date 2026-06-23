# Hexlura - Event Ticketing Platform

## Project Overview

Hexlura is a full-stack event ticketing and booking platform with role-based access control (user, organiser, promoter, door_staff, admin). Built with Next.js 14, React 18, TypeScript, Supabase, and Tailwind CSS.

## Stack

- **Framework**: Next.js 14.2.35 (App Router)
- **Language**: TypeScript 5
- **Database**: Supabase (PostgreSQL with RLS)
- **Auth**: Supabase Auth — email/password only (no OAuth, no magic links)
- **Styling**: Tailwind CSS 3
- **Fonts**: Bebas Neue (headings), DM Sans (body), JetBrains Mono (code)
- **Payments**: Stripe (Elements + Connect + Identity — fully integrated)
- **Email**: Resend + React Email (19 templates)
- **Charts**: Recharts
- **Rich Text**: TipTap editor
- **QR**: qrcode / qrcode.react (generate) + html5-qrcode (scan)

## Key Architecture

### Monetary Values
All monetary values are stored as **integers in pence**. Conversion happens at display time.
- Example: £10.50 = 1050 pence

### Platform Fee
Fee is **paid by the buyer on top of the ticket price**. Organisers receive 100% of their ticket price.
- Default: **5%** per ticket (admin-configurable)
- Min fee per ticket: **£0.99** (99 pence, admin-configurable)
- Max fee per ticket: **£5.00** (500 pence, admin-configurable)
- Configured via `platform_settings` table keys: `booking_fee_percent`, `booking_fee_min_pence`, `booking_fee_max_pence`
- Fee logic in `lib/fees.ts` — `getFeeConfig()` loads live values, falls back to `DEFAULT_FEE_CONFIG`
- Calculation: `clamp(ticketPricePence * percent / 100, minPence, maxPence)`

### Admin-Configurable Platform Settings (`/admin/settings`)
All stored in `platform_settings` table (key/value pairs):

| Key | Default | Purpose |
|---|---|---|
| `booking_fee_percent` | 5 | Platform fee % added to buyer's total |
| `booking_fee_min_pence` | 99 | Min fee per ticket in pence |
| `booking_fee_max_pence` | 500 | Max fee per ticket in pence |
| `max_featured_slots` | 6 | Max events in homepage hero slider |
| `maintenance_mode` | false | Shows maintenance page to public (admins bypass) |
| `auto_approve_organisers` | false | Auto-approve organiser applications without manual review |
| `stripe_connect_enabled` | false | Allow organisers to use Stripe Connect payouts |
| `payout_cooldown_days` | 2 | Days after event ends before payout available for withdrawal |
| `from_name` | Hexlura | Email sender name |
| `from_email` | tickets@hexlura.com | Email sender address |
| `support_email` | support@hexlura.com | Support contact email |

### Role-Based Access Control (RLS)

Supabase enforces Row Level Security (RLS) at the database level:

| Role | Access |
|------|--------|
| **user** | Own bookings, attendee data |
| **organiser** | Own events, attendees, payouts |
| **promoter** | Own referral links, earnings, payouts |
| **door_staff** | Check-in only (assigned events) |
| **admin** | All data across the platform |

**Four Supabase client files:**

1. **`createBrowserClient()`** — anon key, browser-side
   - Located in `lib/supabase/client.ts`
   - Used in client components for real-time and user-scoped queries

2. **`createClient()`** — anon key, server-side with cookie session
   - Located in `lib/supabase/server.ts`
   - Used for auth checks: `supabase.auth.getUser()`
   - Respects RLS — use for user's own data only

3. **`createServiceClient()`** — service role key, RLS bypass
   - Located in `lib/supabase/service.ts`
   - Used in organiser pages to read `organiser_profiles`

4. **`createAdminClient()`** — service role key, RLS bypass
   - Located in `lib/supabase/admin.ts`
   - Used in all admin pages and `/api/admin/*` routes

**Pattern for admin/API routes:**
```typescript
// Anon client for auth check only
const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

// Admin client for ALL DB queries
const adminClient = createAdminClient()
const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
```

### Booking References
Auto-generated format: `HXL-XXXXXX` (6 random alphanumeric characters)
- Generated via Supabase trigger on `bookings` table insert

### PDF Tickets
Browser-based HTML-to-print — no external PDF library.
- Server renders HTML with `@page` CSS rules and QR code data URL
- Returns `text/html` — user's browser prints/saves as PDF
- Handler: `app/api/tickets/[ref]/pdf/route.ts`

### QR Code Ticketing
- **Generate**: `qrcode` (server) + `qrcode.react` (React component)
- **Scan**: `html5-qrcode` camera scanner at `/checkin`
- QR encodes `booking_item.qr_code` (UUID per physical ticket)

---

## Cron Jobs (Vercel)

Configured in `vercel.json`:

| Schedule (UTC) | Endpoint | Purpose |
|---|---|---|
| 03:00 daily | `/api/cron/end-events` | Mark events as 'ended' when past start_at |
| 09:00 daily | `/api/cron/event-reminders` | Send 24h reminder emails to attendees |

Both endpoints validate `Authorization: Bearer <CRON_SECRET>`.

---

## Stripe Webhooks

Handler: `app/api/webhooks/stripe/route.ts`

| Event | Action |
|---|---|
| `payment_intent.succeeded` | Create booking, booking_items, send confirmation email, trigger Connect transfer |
| `checkout.session.completed` | Fallback booking creation path |
| `payment_intent.payment_failed` | Cancel booking, release ticket reservations |
| `transfer.failed` | Mark payout failed, notify admin, send alert email |
| `account.updated` | Log Stripe Connect account status changes |
| `identity.verification_session.verified` | Update organiser identity status, send success email |
| `identity.verification_session.requires_input` | Mark identity as requires_input |
| `identity.verification_session.canceled` | Mark identity as canceled |

Webhook also reads `promoter_id` and `promoter_commission_pence` from payment metadata to insert `promoter_earnings` ledger entries.

---

## Email Templates (19 total)

Located in `emails/` directory, rendered via React Email, sent via Resend:

`announcement`, `booking-confirmation`, `email-verification`, `event-cancelled`, `event-published`, `event-reminder`, `new-booking-organiser`, `organiser-identity-verified`, `organiser-welcome`, `password-reset`, `payout-failed-admin`, `payout-paid-organiser`, `payout-paid-promoter`, `promoter-invite`, `promoter-welcome`, `refund-admin-review`, `refund-request-organiser`, `user-welcome`, `waitlist-available`

---

## Route Structure

```
(public)/                 — public site (home, browse, events, organiser profiles, static pages)
auth/                     — login, register, verify, reset-password, update-password
(user)/                   — protected user routes (account, bookings, checkout)
(organiser-open)/         — organiser registration (apply, pending approval)
(organiser)/organiser/    — organiser dashboard (events, payouts, attendees, analytics, team)
(promoter-open)/          — promoter invite acceptance flow
(promoter)/promoter/      — promoter dashboard (referrals, earnings, payouts)
(admin)/admin/            — admin dashboard (users, organisers, bookings, events, payouts, financials, audit-log, settings)
checkin/                  — QR code scanner for door staff
api/                      — API routes (auth, checkout, stripe webhooks, cron, admin actions, tickets)
```

---

## Database Schema

**31 tables** across 42 migration files in `supabase/migrations/`:

| Table | Purpose |
|---|---|
| `profiles` | All user accounts (roles: user, organiser, promoter, door_staff, admin) |
| `organiser_profiles` | Organiser details (VAT, Stripe Connect ID, identity verification status) |
| `events` | Event records (title, venue, dates, status, slug) |
| `ticket_types` | Ticket tiers per event (price, quantity, sale window) |
| `promo_codes` | Discount codes (event-level or platform-wide) |
| `bookings` | Booking records (status, fee breakdown, Stripe refs) |
| `booking_items` | Individual tickets per booking (QR code UUID per ticket) |
| `payouts` | Organiser payout records |
| `checkins` | Door check-in records per ticket |
| `waitlist` | Waitlist entries per event |
| `reviews` | Event reviews (1–5 stars) |
| `notifications` | In-app notification inbox (all roles) |
| `audit_logs` | Admin action audit trail |
| `refund_requests` | Refund request workflow |
| `platform_settings` | Admin-configurable key/value settings |
| `follows` | User follows organiser |
| `likes` | User likes event |
| `door_staff` | Door staff assignments per event |
| `reservations` | Ticket holds during checkout |
| `organiser_team` | Team member assignments (co-organisers, door staff) |
| `cities` | Admin-managed city list (homepage cards) |
| `organiser_portfolio` | Organiser portfolio showcase items |
| `seo_metadata` | Per-page SEO title/description (admin-managed) |
| `promoter_profiles` | Promoter registration and referral codes |
| `promoter_event_assignments` | Promoter → Event commission rate mapping |
| `promoter_link_clicks` | Click tracking for referral links |
| `promoter_earnings` | Commission ledger per booking |
| `promoter_payouts` | Promoter payout records |
| `categories` | Event categories (12 types, admin-managed) |
| `support_tickets` | Support ticket threads (all roles) |
| `support_messages` | Messages within support tickets |

All tables have RLS enabled. Primary keys are UUIDs. Timestamps are `timestamptz`.

---

## Key Files

| File | Purpose |
|------|---------|
| `types/index.ts` | All TypeScript interfaces |
| `lib/fees.ts` | Platform fee calculation logic |
| `lib/email.ts` | Resend email client initialisation |
| `lib/stripe.ts` | Stripe server client initialisation |
| `lib/audit.ts` | Audit logging for admin actions |
| `lib/promoter-tracking.ts` | Promoter referral click tracking |
| `lib/supabase/client.ts` | Browser anon client |
| `lib/supabase/server.ts` | Server anon client (cookie session) |
| `lib/supabase/service.ts` | Service-role client (organiser pages) |
| `lib/supabase/admin.ts` | Service-role client (admin portal) |
| `lib/supabase/middleware.ts` | Session refresh + role-based routing |
| `middleware.ts` | Route matching, session refresh, redirects |
| `app/auth/actions.ts` | Server actions for signin/signout/password-reset |
| `app/api/webhooks/stripe/route.ts` | Stripe webhook handler (8 event types) |
| `app/api/cron/end-events/route.ts` | Cron: mark ended events |
| `app/api/cron/event-reminders/route.ts` | Cron: send 24h reminder emails |
| `app/api/tickets/[ref]/pdf/route.ts` | PDF ticket generation (HTML-to-print) |
| `vercel.json` | Cron job schedules |

---

## Environment Variables

All secrets are stored in Vercel (not committed to git). For local dev create `.env.local`:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # Server-side only — never expose to client

# Stripe
STRIPE_SECRET_KEY=                  # sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY= # pk_live_...
STRIPE_WEBHOOK_SECRET=              # whsec_... — from Stripe dashboard
STRIPE_IDENTITY_FLOW_ID=            # Stripe Identity verification flow ID
STRIPE_CONNECT_CLIENT_ID=           # Stripe Connect OAuth client ID

# Email
RESEND_API_KEY=                     # re_...

# App
NEXT_PUBLIC_APP_URL=                # https://hexlura.com
NEXT_PUBLIC_SITE_URL=               # https://www.hexlura.com
NEXT_PUBLIC_GA_MEASUREMENT_ID=      # G-... (optional)

# Security
CRON_SECRET=                        # Bearer token for Vercel cron endpoints
ADMIN_SECRET=                       # Admin-only endpoint secret
PROMOTER_CLICK_SALT=                # Salt for promoter link click hashing
```

---

## Running the Project

```bash
npm install
npm run dev          # http://localhost:3000
npm run build
npm run type-check
```

---

## Recent Critical Fixes

### ✅ Admin Portal RLS Bug
**Problem**: Admin portal showed empty data — pages used anon key which RLS blocked.
**Solution**: Created `lib/supabase/admin.ts`, updated all 9 admin pages and 19 API routes under `/api/admin/*/` to use `createAdminClient()`.

### ✅ Organiser Sidebar Navigation Bug
**Problem**: All organiser sub-pages redirected to `/organiser` — anon key returned null for `organiser_profiles`.
**Solution**: Updated organiser sub-pages to use `createServiceClient()`.

### ✅ Auth Middleware & Role-Based Redirects
**Problem**: Redirect loops across login/organiser/admin routes.
**Solution**: Rewrote `lib/supabase/middleware.ts` — 3-step flow (refresh → get user → role routing). See commit `5d8e28f`.

---

## Security Standards (Mandatory)

Every API route, server action, and data mutation must pass this checklist before being considered done. No exceptions.

### 8-Point Security Checklist

1. **Auth** — Is the caller authenticated? Always use `createClient()` + `supabase.auth.getUser()` first.
2. **Authorization** — Is the caller allowed to act on this specific resource? Check role AND ownership (e.g. organiser owns the event, user owns the booking).
3. **Input validation** — Are all user-supplied values validated against an explicit allowlist or numeric range before touching the DB? Never write arbitrary strings directly to the database.
4. **Secrets** — Are secrets passed in `Authorization: Bearer` headers, never in query strings or URLs (query strings appear in server logs, browser history, and Referer headers).
5. **OAuth / state tokens** — Are state parameters session-bound (verified against the logged-in user), never a plain user ID that an attacker can forge.
6. **Output encoding** — Is user-controlled data (event titles, names, etc.) HTML-escaped before being interpolated into raw HTML strings (emails, PDFs)? React components are safe; manual string interpolation is not.
7. **Role scoping** — Does each role only access their own data? Door staff → assigned events only. Organiser → own events only. Promoter → own referrals only.
8. **Side-effect ordering** — Do destructive state changes (cancel booking, void tickets, mark refunded) only happen AFTER the irreversible external action (Stripe charge/refund) has succeeded?

### Known Patterns to Never Repeat

| Anti-pattern | Correct pattern |
|---|---|
| `searchParams.get('secret')` for auth | `req.headers.get('authorization')` Bearer token |
| `state: user.id` in OAuth flow | Verify `session.user.id === state` in callback |
| `update({ role: anyString })` | Validate against `['user','organiser','promoter','door_staff','admin']` |
| `upsert({ key: anyKey })` on settings | Validate key against explicit allowlist first |
| Door staff role check without event check | Also verify assignment to the specific event being scanned |
| Organiser approval cancels tickets immediately | Only cancel booking/items after Stripe refund is confirmed |
| `<strong>${eventName}</strong>` in email HTML | `<strong>${escHtml(eventName)}</strong>` |
| Public OAuth callback with no session check | `getUser()` first, reject if `user.id !== state` |

---

## Collaboration Notes

When taking over this project:
1. Read this file first
2. Run `npm run build` to verify no errors
3. Check `git log` for recent context
4. Explore `types/index.ts` for the full data model
