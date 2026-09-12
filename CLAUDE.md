# Hexlura - Event Ticketing Platform

## Project Overview

Hexlura is a full-stack event ticketing and booking platform with role-based access control (user, organiser, promoter, door_staff, admin). Built with Next.js 14, React 18, TypeScript, Supabase, and Tailwind CSS.

## Stack

- **Framework**: Next.js 14.2.35 (App Router)
- **Language**: TypeScript 5
- **Database**: Supabase (PostgreSQL with RLS)
- **Auth**: Supabase Auth — email/password **and Google OAuth** (`app/auth/actions.ts`). No magic links.
- **Styling**: Tailwind CSS 3
- **Fonts**: Bebas Neue (headings), DM Sans (body), JetBrains Mono (code)
- **Payments**: Stripe (Elements + Connect + Identity — fully integrated)
- **Email**: Resend + React Email (28 templates in `emails/`)
- **Charts**: Recharts
- **Rich Text**: TipTap editor
- **QR**: qrcode / qrcode.react (generate) + html5-qrcode (web scan)
- **Door scanner app**: Flutter (`mobile-scanner-app-flutter/`) — Android, talks to `/api/checkin/*`

## Key Architecture

### Monetary Values
All monetary values are stored as **integers in pence**. Conversion happens at display time.
- Example: £10.50 = 1050 pence

### Platform Fee
Fee is **paid by the buyer on top of the ticket price**. Organisers receive 100% of their ticket price —
nothing is ever deducted from their proceeds.

Two separate fees, both platform revenue:
- **Booking fee** — per *ticket*: `clamp(price * percent / 100, min, max)`
- **Order processing fee** — per *order*, flat (`order_processing_fee_pence`)

⚠️ **Never quote `DEFAULT_FEE_CONFIG` as "the fee"** — it is all zeros, a fallback for when
`platform_settings` can't be read. The real values are live in the DB and admin-editable.
Read them with `getFeeConfig()` (`lib/fees.ts`) or query `platform_settings` — don't hardcode.

Per-organiser exemptions: `organiser_profiles.booking_fee_exempt` / `.processing_fee_exempt`.

**Fee visibility rule:** the platform fee is deliberately **hidden from organisers**. Organiser-facing
pages show ticket revenue only, never the fee or the buyer's gross total (they'd otherwise derive the
fee by subtraction). Admin pages show everything. Don't add a fee/gross column to organiser views.

### Admin-Configurable Platform Settings (`/admin/settings`)
Key/value pairs in `platform_settings`. **Values below are illustrative, not authoritative** — they
change in production without code edits. Always read live.

| Key | Purpose |
|---|---|
| `booking_fee_percent` | Booking fee % per ticket |
| `booking_fee_min_pence` / `booking_fee_max_pence` | Clamp bounds for the per-ticket fee |
| `order_processing_fee_pence` | Flat per-order fee |
| `max_featured_slots` | Max events in homepage hero slider |
| `maintenance_mode` | Shows maintenance page to public (admins bypass) |
| `auto_approve_organisers` | Auto-approve organiser applications |
| `stripe_connect_enabled` | Allow organisers to use Stripe Connect payouts |
| `payout_cooldown_days` | Days after event ends before payout is released |
| `from_name` / `from_email` / `support_email` | Email sender + support contact |
| `featured_cities` | Comma-separated homepage city list |
| `meta_pixel_id` | Meta Pixel tracking ID |
| `design_color_*` (10 keys), `design_font_heading`, `design_font_body` | Live theme tokens |
| `seo_site_name`, `seo_default_description`, `seo_default_og_image`, `seo_twitter_handle` | SEO defaults |

Writes must validate the key against an explicit allowlist (`VALID_SETTING_KEYS`) — never `upsert`
an arbitrary key.

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

## Stripe Charge Routing

Three charge shapes, decided per checkout in `app/api/checkout/create-intent/route.ts` and recorded in
PaymentIntent metadata as `charge_type`:

| `charge_type` | When | Money flow |
|---|---|---|
| `destination` | Connect onboarded + allowed + charges enabled | Platform charges; Stripe auto-transfers ticket revenue to the organiser and claws the fee back as an **application fee** |
| `direct` | As above **and** both fees exempt | PaymentIntent created **on the connected account** (`stripeAccount` option) — nothing for the platform to collect |
| `platform` | No Connect account | Money stays with the platform; paid out later via `payouts` |

`bookings.needs_manual_payout` is set per booking at webhook time (`!organiserStripeAccountId`, flipped
`true` if a per-booking transfer fails). `lib/generate-payouts.ts` keys off it: bookings already settled
via Connect never generate a payable payout — otherwise processing one would send the money twice.

## Stripe Webhooks

**Two registered endpoints** (verify with `GET /v1/webhook_endpoints` — don't assume):

`app/api/webhooks/stripe/route.ts` — platform account:

| Event | Action |
|---|---|
| `payment_intent.succeeded` | Create booking + items, email tickets, Connect transfer (via `lib/process-payment-success.ts`) |
| `checkout.session.completed` | Fallback booking creation path |
| `payment_intent.payment_failed` | Cancel booking, release reservations |
| `transfer.reversed` | Mark payout failed, notify admin, send alert email |
| `identity.verification_session.{verified,requires_input,canceled}` | Update organiser identity status |

`app/api/webhooks/stripe/connect/route.ts` — connected accounts (direct charges fire here, not on the
platform): `payment_intent.succeeded`, `payment_intent.payment_failed`, `account.updated`.

Both share `lib/process-payment-success.ts`, which is **idempotent** (skips if a booking already exists
for the PaymentIntent). Any new booking-creation path must do the same.

Webhooks also read `promoter_id` / `promoter_commission_pence` from metadata to write `promoter_earnings`.

### Stripe gotcha: finding an application fee for a charge
Application fees are keyed to the **connected-account** charge (`py_…`), not the platform charge
(`ch_…`). `GET /v1/application_fees?charge=ch_…` returns an empty list even when the fee exists —
which reads as "fee never collected" and is wrong. Match on `originating_transaction` instead.

---

## Email Templates (28)

In `emails/`, rendered via React Email, sent via Resend. Run `ls emails/` for the current list rather
than trusting this one — it grows often.

`account-deletion-approved`, `account-deletion-requested-admin`, `announcement`, `booking-confirmation`,
`email-verification`, `event-cancelled`, `event-deletion-requested-admin`, `event-promo-campaign`,
`event-published`, `event-reminder`, `new-booking-organiser`, `new-event-followers`,
`organiser-identity-verified`, `organiser-welcome`, `password-reset`, `payout-failed-admin`,
`payout-paid-organiser`, `payout-paid-promoter`, `payout-request-admin`, `payout-requested-organiser`,
`promoter-invite`, `promoter-payout-request-admin`, `promoter-welcome`, `refund-admin-review`,
`refund-request-organiser`, `stripe-connected`, `team-invite`, `user-welcome`, `waitlist-available`

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
checkin/                  — QR code scanner for door staff (web)
api/                      — API routes (auth, checkout, stripe webhooks, cron, admin actions, tickets)
api/checkin/              — JSON API for the Flutter scanner app (events, attendees, lookup, check-in)
```

### Door check-in
Three overlapping door-staff systems exist — legacy `profiles.role = 'door_staff'`, the legacy
`door_staff` table, and `organiser_team` with `privilege = 'door_staff'`. **Never check these
ad-hoc.** All four check-in endpoints go through `lib/checkin/authorize.ts`
(`resolveDoorStaffContext()` + `isEventAssigned()`), which resolves all three and re-verifies
assignment to the specific event on every request.

The Flutter app (`mobile-scanner-app-flutter/`) authenticates with `Authorization: Bearer <token>`;
the web scanner uses the cookie session. `lib/supabase/getRequestUser.ts` accepts either.
`AppConfig.appUrl` must point at the **canonical `www` host** — the apex domain 301-redirects, and a
cross-host redirect drops the Authorization header (and downgrades POST to GET), so every call
silently 401s.

---

## Database Schema

**42 tables** across 76 migration files in `supabase/migrations/`:

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
| `promo_code_redemptions` | One row per redemption — enforces per-customer promo limits |
| `event_slug_history` | Old event slugs → permanent redirects so shared links never 404 |
| `legal_documents` | Admin-published Terms/Privacy (see below) |
| `event_deletion_requests` | Organiser-requested event deletion workflow |
| `organiser_account_deletion_requests` | Organiser account closure workflow |
| `organiser_email_lists` / `_entries` | Organiser-owned marketing lists |
| `organiser_email_campaigns` / `_sends` | Campaign records and per-recipient send log |
| `contact_enquiries` | Public contact-form submissions |
| `page_controls` | Admin toggles for public page sections |

All tables have RLS enabled. Primary keys are UUIDs. Timestamps are `timestamptz`.

### Legal documents & terms re-acceptance
`/terms` and `/privacy` render the latest **published row in `legal_documents`**; the hardcoded
`terms-client.tsx` is only a fallback used when no published row exists — editing that file alone
changes nothing in production.

`app/(organiser)/layout.tsx` force-redirects an organiser to `/organiser/terms-update` whenever their
`organiser_profiles.terms_version` ≠ the latest published version. **Publishing a new version locks
every organiser out until they re-accept** — so a wording correction that doesn't change obligations is
usually edited in place on the existing row, keeping the version, rather than published as a new one.

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
| `app/api/webhooks/stripe/route.ts` | Stripe webhook handler (platform account) |
| `app/api/webhooks/stripe/connect/route.ts` | Stripe webhook handler (connected accounts) |
| `lib/process-payment-success.ts` | Shared, idempotent booking creation from a PaymentIntent |
| `lib/generate-payouts.ts` | Auto-generates payout rows after the cooldown |
| `lib/checkin/authorize.ts` | Single source of truth for door-staff authorization |
| `lib/supabase/getRequestUser.ts` | Resolves caller from Bearer token **or** cookie session |
| `lib/notify-admins.ts` | In-app notification fan-out to all admins |
| `lib/legal.ts` | Fetches the latest published Terms/Privacy document |
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

## Recurring Failure Modes

Bugs this codebase has produced more than once. Check for these first.

### Next.js Data Cache on server-side Supabase clients
Server-side Supabase `fetch` calls get cached by Next.js's persistent Data Cache and can serve stale
results across requests *and deployments* — including auth checks, where a rejected token stays
rejected forever. Every server-side client must override fetch with `cache: 'no-store'`. Already done
in `lib/supabase/admin.ts`, `server.ts`, `getRequestUser.ts` — copy the pattern in any new client.

### PostgREST schema cache after out-of-band DDL
DDL applied outside the CLI migration flow leaves PostgREST's schema cache stale, so new columns and
functions 404 at the API layer. Fix: `NOTIFY pgrst, 'reload schema';`

### Ambiguous embeds (PGRST201)
Two FKs to the same table make `alias:table(...)` ambiguous. Disambiguate with the column:
`ticket_types!ticket_type_id(name)`. `promo_codes` has both `ticket_type_id` and `comp_ticket_type_id`.

### Silent error swallowing
Repeatedly the root cause of "looks broken but isn't" / "looks fine but isn't". Never
`const { data } = await query` while dropping `error`, and never `catch {}` around a call whose
failure changes what the code should do next. Surface it — a failed call must not fall through to the
success path.

### Group tickets distort per-ticket-type sums
A group ticket writes the **full group price** onto every member row in `booking_items`, so summing
`unit_price_pence` massively overcounts. Only `bookings.ticket_subtotal_pence` reconciles with Stripe.

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
| `catch {}` around a Stripe refund, then mark refunded | On failure, leave state untouched, alert admin, return an error |
| New booking-creation path without an idempotency check | Look up `stripe_payment_intent_id` first and bail if it exists |
| Generating a payout for a Connect-settled booking | Gate on `bookings.needs_manual_payout` — they were already paid |
| OAuth verified after a fixed delay | Gate on the actual `signedIn` event; `signInWithOAuth` returns when the browser opens, not when sign-in completes |

---

## Collaboration Notes

When taking over this project:
1. Read this file first
2. Run `npm run build` to verify no errors
3. Check `git log` for recent context
4. Explore `types/index.ts` for the full data model

### Workflow
- **Live in production.** `main` auto-deploys to Vercel on push — there is no staging environment.
- Work on a branch, `npm run build` **before** merging, then merge to `main` and push.
- The owner previews on Vercel, not `localhost` — `npm run dev` is not part of the loop.
- Other collaborators also push directly to `main`; pull before branching.

### Verify, don't assume
This codebase has burned several sessions on confident-but-wrong conclusions. Before reporting a bug
or a number:
- Check the thing is actually **reachable** — a scary-looking route may be dead code (e.g. a webhook
  URL that isn't registered in Stripe). Confirm via the live API, not the file tree.
- Validate a query against a **known-good case** before trusting a negative result. An empty result
  often means the query is wrong, not that the data is missing.
- Money figures must reconcile against Stripe (or the DB) from a second, independent angle before
  being reported.
