# Hexlura - Event Ticketing Platform

## Project Overview

Hexlura is a full-stack event ticketing and booking platform with role-based access control (user, organiser, admin). Built with Next.js 14, React 18, TypeScript, Supabase, and Tailwind CSS.

## Stack

- **Framework**: Next.js 14.2.35 (App Router)
- **Language**: TypeScript 5
- **Database**: Supabase (PostgreSQL with RLS)
- **Auth**: Supabase Auth
- **Styling**: Tailwind CSS 3
- **Fonts**: Bebas Neue (headings), DM Sans (body), JetBrains Mono (code)
- **Payments**: Stripe (fields present, integration in progress)

## Key Architecture

### Monetary Values
All monetary values are stored as **integers in pence**, not dollars. Conversion happens at display time.
- Example: £10.50 = 1050 pence

### Platform Fee
Platform takes 6% fee on all bookings. Calculated at checkout, stored separately from ticket price.

### Role-Based Access Control (RLS)

Supabase enforces Row Level Security (RLS) at the database level:

| Role | Access |
|------|--------|
| **user** | Own bookings, attendee data |
| **organiser** | Own events, attendees, payouts |
| **admin** | All data across the platform |

**Three Supabase client types are used:**

1. **`createClient()`** — anon key, session-aware
   - Used for auth checks: `supabase.auth.getUser()`
   - Used for user's own data (respects RLS)
   - Located in `lib/supabase/server.ts`

2. **`createServiceClient()`** — service role key, RLS bypass
   - Used in organiser pages to read `organiser_profiles`
   - Located in `lib/supabase/service.ts`
   - Example: `/organiser/events/page.tsx`

3. **`createAdminClient()`** — service role key, RLS bypass
   - Used in all admin pages and `/api/admin/*` routes
   - Allows admin to read/write all user data
   - Located in `lib/supabase/admin.ts` (NEW - created during RLS fix)
   - Example: `/api/admin/users/[id]/role/route.ts`

### Booking References

Booking references are auto-generated in format: `HXL-XXXXXX` (6 random characters)
- Generated via Supabase trigger on `bookings` table insert
- Used in customer-facing emails and QR code ticketing

### QR Code Ticketing

Check-in uses QR codes embedded in booking reference. See `/organiser/events/[id]/checkin/` for implementation.

---

## Recent Critical Fixes

### ✅ Admin Portal RLS Bug (LATEST)

**Problem**: Admin portal showed "No users found" and "No pending applications"
- Root cause: Admin pages and API routes used `createClient()` (anon key) for DB queries
- Supabase RLS blocked anon-key access to other users' data
- Result: Empty data on all admin pages

**Solution**:
1. Created `lib/supabase/admin.ts` with `createAdminClient()` function
2. Updated all **9 admin pages** to use `adminClient` for DB queries:
   - `/admin/page.tsx` (dashboard KPIs)
   - `/admin/users/page.tsx`
   - `/admin/organisers/page.tsx`
   - `/admin/bookings/page.tsx`
   - `/admin/events/page.tsx`
   - `/admin/payouts/page.tsx`
   - `/admin/financials/page.tsx`
   - `/admin/audit-log/page.tsx`
   - `/admin/settings/page.tsx`

3. Updated all **19 API routes** under `/api/admin/*/` to use `adminClient`:
   - User management: role, suspend, unsuspend, resend-verification
   - Organiser management: approve, reject, suspend, reinstate
   - Event management: feature, delist, cancel
   - Booking/refund: refund (full/partial), refund-requests reject, resend-confirmation
   - Payouts: process transfer
   - Admin tools: impersonate, export, promo-codes, settings

**Pattern applied**:
```typescript
// Keep anon client for auth check
const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

// Use admin client for ALL DB queries
const adminClient = createAdminClient()
const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
```

### ✅ Organiser Sidebar Navigation Bug

**Problem**: All organiser sidebar links redirected back to `/organiser` dashboard
- Root cause: All 6 sub-pages used `createClient()` for `organiser_profiles` lookup
- RLS blocked anon-key, returned null, triggered redirect to `/organiser/pending`

**Solution**: Updated all organiser sub-pages to use `createServiceClient()` for organiser_profiles queries

### ✅ Auth Middleware & Role-Based Redirects

**Problem**: Redirect loops between `/`, `/auth/login`, `/organiser/pending`, `/organiser`, `/admin`

**Solution**: Rewrote `lib/supabase/middleware.ts` with:
- 3-step flow: refresh session → get user → role-based routing
- Proper cookie preservation on all redirects
- Role lookups via service client (not anon)

See commit `5d8e28f` for full middleware rewrite.

---

## Route Structure

```
(public)/                 — public site (home, browse, events, organiser profiles)
auth/                     — login, register, verify, reset-password, update-password
(user)/                   — protected user routes (account, bookings, checkout)
(organiser-open)/         — organiser registration flow (apply, pending approval)
(organiser)/organiser/    — organiser dashboard (events, payouts, attendees, analytics, settings)
(admin)/admin/            — admin dashboard (users, organisers, bookings, events, payouts, financials, audit-log)
api/                      — API routes (auth, checkout, stripe, events, admin actions)
```

---

## Key Files

| File | Purpose |
|------|---------|
| `types/index.ts` | All TypeScript interfaces (User, Organiser, Event, Booking, etc.) |
| `supabase/migrations/001_initial_schema.sql` | Full DB schema (13 tables: profiles, organiser_profiles, events, bookings, payouts, refund_requests, etc.) |
| `lib/supabase/server.ts` | Anon-key client for server components |
| `lib/supabase/service.ts` | Service-role client for organiser pages |
| `lib/supabase/admin.ts` | Service-role client for admin portal (NEW) |
| `lib/audit.ts` | Audit logging for admin actions |
| `middleware.ts` | Session refresh, role-based routing, cookie preservation |
| `app/auth/actions.ts` | Server actions for signin/signout/password-reset |
| `components/ui/Button.tsx`, `Card.tsx` | Reusable UI components (TODOs for styling present) |

---

## Running the Project

### Install & Development
```bash
npm install
npm run dev
```
Runs on `http://localhost:3000`

### Build & Production
```bash
npm run build
npm run start
```

### Running Tests
```bash
npm test
```

### Type Checking
```bash
npm run type-check
```

---

## Environment Variables

Create a `.env.local` file (not committed to git):
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

**Note**: `SUPABASE_SERVICE_ROLE_KEY` is secret and only used server-side (Next.js only, not exposed to client)

---

## Testing the Admin Portal

1. **Create an admin user** in Supabase:
   - Insert into `auth.users` with email
   - Insert into `profiles` with `role = 'admin'`

2. **Login** and navigate to `/admin`

3. **Verify pages work**:
   - `/admin/users` should show all users (not "No users found")
   - `/admin/organisers` should show pending organiser applications
   - `/admin/bookings` should show all bookings
   - `/admin/events` should list all events

---

## Known TODOs

- Stripe payment integration (fields present in DB, logic not yet implemented)
- Email sending for confirmations/notifications (Resend integration started)
- Some UI components have styling TODOs (`components/ui/Button.tsx`, `Card.tsx`)
- React hook dependency array warnings (pre-existing, low priority)

---

## Collaboration Notes

This project is designed for team handoff. When transitioning to another developer:
1. Read this file first
2. Check `git log` for recent commits and reasoning
3. Run `npm run build` to verify no errors
4. Read code comments for non-obvious logic
5. Explore `types/index.ts` for data model understanding

The auto-memory system (saved in each Claude session) supplements this file but doesn't replace it. Always document significant architectural decisions here.
