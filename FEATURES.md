# Hexlura — Complete Feature List

**Legend**: ✅ Built & Working · ⚠️ Partial / Needs Config · 🔧 Optional / Not Required

---

## Public / Guest (No Login Required)

| Feature | Status |
|---|---|
| Home page — hero slider with featured events | ✅ |
| Home page — category navigation tiles | ✅ |
| Home page — city cards | ✅ |
| Home page — upcoming events row | ✅ |
| Home page — past events compact horizontal scroll | ✅ |
| Home page — organiser CTA section | ✅ |
| Browse events page | ✅ |
| Search events by keyword | ✅ |
| Filter events by category | ✅ |
| Filter events by city | ✅ |
| Filter events by date | ✅ |
| Filter events by price range | ✅ |
| Event detail page (description, venue, ticket types, reviews) | ✅ |
| Organiser public profile page | ✅ |
| Promoter referral link tracking (before checkout) | ✅ |
| Promo code validation (public endpoint) | ✅ |
| About page | ✅ |
| How It Works page | ✅ |
| Sell Tickets landing page | ✅ |
| Contact page | ✅ |
| Privacy Policy page | ✅ |
| Terms of Service page | ✅ |
| Cookie Policy page | ✅ |
| SEO metadata per page (admin-managed) | ✅ |

---

## Auth

| Feature | Status |
|---|---|
| Register with email & password | ✅ |
| Email verification flow | ✅ |
| Login with email & password | ✅ |
| Password reset (forgot password) | ✅ |
| Update password | ✅ |
| Session refresh via middleware | ✅ |
| Role-based redirect on login | ✅ |
| Redirect loops prevention | ✅ |

---

## User (Logged-In Customer)

### Account
| Feature | Status |
|---|---|
| View & edit profile (name, phone, avatar) | ✅ |
| Change password | ✅ |
| Email notification preferences | ✅ |
| Account deletion | ✅ |

### Checkout & Booking
| Feature | Status |
|---|---|
| Multi-step checkout flow | ✅ |
| Select ticket type & quantity | ✅ |
| Real-time ticket availability check | ✅ |
| Attendee name & email collection per ticket | ✅ |
| Group ticket support | ✅ |
| Promo code input & validation | ✅ |
| Platform fee calculation shown before payment (admin-configurable %) | ✅ |
| Stripe card payment (Elements) | ✅ |
| Complimentary (comp) ticket redemption | ✅ |
| Booking confirmation page | ✅ |
| Booking reference generation (HXL-XXXXXX) | ✅ |
| Booking confirmation email with PDF ticket | ✅ |
| Ticket reservation hold during checkout | ✅ |

### Bookings
| Feature | Status |
|---|---|
| View all bookings (Upcoming / Past / Cancelled tabs) | ✅ |
| View single booking detail | ✅ |
| Download PDF ticket with QR code | ✅ |
| Refund request (policy-based eligibility) | ✅ |
| View refund request status | ✅ |

### Discovery & Social
| Feature | Status |
|---|---|
| Like / unlike events | ✅ |
| Favourited events list | ✅ |
| Follow organisers | ✅ |
| Leave event reviews | ✅ |
| Join event waitlist | ✅ |

### Notifications & Support
| Feature | Status |
|---|---|
| In-app notification inbox | ✅ |
| Mark notifications as read | ✅ |
| Create support ticket | ✅ |
| View & reply to support tickets | ✅ |
| Track support ticket status | ✅ |

---

## Organiser

### Registration & Approval
| Feature | Status |
|---|---|
| Organiser application form | ✅ |
| Pending approval holding page | ✅ |
| Admin approval triggers welcome email | ✅ |
| Access blocked until approved | ✅ |

### Dashboard
| Feature | Status |
|---|---|
| KPI cards (revenue, bookings, events, payouts) | ✅ |
| Revenue chart | ✅ |
| Recent transactions list | ✅ |

### Event Management
| Feature | Status |
|---|---|
| Create event (full form) | ✅ |
| Edit event details | ✅ |
| Duplicate event | ✅ |
| Delete event (draft only) | ✅ |
| Event title & auto-generated slug | ✅ |
| Category selection (12 types) | ✅ |
| Rich text event description (TipTap editor) | ✅ |
| Venue name, address, postcode, geolocation | ✅ |
| Start & end date/time (Europe/London timezone) | ✅ |
| Banner image upload | ✅ |
| Minimum age requirement | ✅ |
| Refund policy per event (None / 48h / 7d / Full) | ✅ |
| Event status workflow (Draft → Published → Ended → Archived) | ✅ |
| Cancel event | ✅ |
| Featured event toggle (admin-controlled) | ✅ |

### Ticket Types
| Feature | Status |
|---|---|
| Multiple ticket tiers per event | ✅ |
| Price in GBP (stored in pence) | ✅ |
| Total quantity limit | ✅ |
| Per-order quantity limit | ✅ |
| Sale window (start & end dates) | ✅ |
| Group ticket support | ✅ |
| Visibility toggle per ticket type | ✅ |
| Comp (complimentary) code generation | ✅ |

### Attendees & Check-In
| Feature | Status |
|---|---|
| Attendee list per event | ✅ |
| Cross-event attendee view | ✅ |
| Export attendees as CSV | ✅ |
| QR code check-in scanner (mobile-friendly) | ✅ |
| Real-time check-in tracking | ✅ |
| Door staff team access for check-in | ✅ |
| Send announcements to attendees | ✅ |

### Bookings & Refunds
| Feature | Status |
|---|---|
| View all bookings for own events | ✅ |
| View single booking detail | ✅ |
| View inbound refund requests | ✅ |
| Approve / reject refund requests | ✅ |

### Payouts & Financials
| Feature | Status |
|---|---|
| Payout history with status | ✅ |
| Request payout withdrawal | ✅ |
| Stripe Connect payout setup | ✅ |
| Bank transfer payout method | ✅ |
| Identity verification (Stripe Identity) | ✅ |
| VAT number storage | ✅ |

### Team & Promoters
| Feature | Status |
|---|---|
| Invite door staff team members | ✅ |
| Manage team member permissions | ✅ |
| Invite promoters with commission rate | ✅ |
| View promoter referral stats per event | ✅ |
| Remove promoters | ✅ |

### Analytics
| Feature | Status |
|---|---|
| Revenue chart over time | ✅ |
| Ticket sales breakdown by type | ✅ |
| Event performance metrics | ✅ |
| Booking count & revenue per event | ✅ |

### Public Profile & Support
| Feature | Status |
|---|---|
| Edit public organiser portfolio | ✅ |
| Organiser profile (name, description, logo, website) | ✅ |
| Support tickets | ✅ |
| Notifications | ✅ |

---

## Promoter

### Registration
| Feature | Status |
|---|---|
| Promoter application form | ✅ |
| Accept organiser invite via link/token | ✅ |
| Auto-approval or admin approval flow | ✅ |
| Pending approval page | ✅ |

### Dashboard
| Feature | Status |
|---|---|
| KPI cards (earnings, pending payout, clicks, sales) | ✅ |
| Revenue chart (last 7 days) | ✅ |
| Recent sales list | ✅ |

### Referral Links
| Feature | Status |
|---|---|
| Unique referral link per event | ✅ |
| Click tracking (unique + total) | ✅ |
| QR code for referral links | ✅ |
| Sales attributed per link | ✅ |
| Commission % per event | ✅ |

### Earnings & Payouts
| Feature | Status |
|---|---|
| Earnings ledger (status: pending / available / paid) | ✅ |
| Earnings breakdown by event | ✅ |
| Request payout withdrawal | ✅ |
| Payout history | ✅ |
| Bank details setup | ✅ |

### Support & Notifications
| Feature | Status |
|---|---|
| Support tickets | ✅ |
| Notifications (payouts, sales, invites) | ✅ |

---

## Admin

### Dashboard
| Feature | Status |
|---|---|
| KPI cards (users, revenue, events, bookings) | ✅ |
| Recent bookings | ✅ |
| System health overview | ✅ |

### User Management
| Feature | Status |
|---|---|
| View all users with booking stats | ✅ |
| Search users | ✅ |
| Filter by role, status, join date | ✅ |
| Change user role | ✅ |
| Suspend user (with reason) | ✅ |
| Unsuspend user | ✅ |
| Resend email verification | ✅ |
| Impersonate user for debugging | ✅ |
| Exit impersonation | ✅ |

### Organiser Management
| Feature | Status |
|---|---|
| View pending organiser applications | ✅ |
| Approve application | ✅ |
| Reject application (with reason) | ✅ |
| Suspend organiser | ✅ |
| Reinstate organiser | ✅ |
| View identity verification status | ✅ |

### Promoter Management
| Feature | Status |
|---|---|
| View all promoters | ✅ |
| Suspend promoter | ✅ |
| Reinstate promoter | ✅ |

### Event Management
| Feature | Status |
|---|---|
| View all platform events | ✅ |
| Feature / unfeature event | ✅ |
| Delist event | ✅ |
| Cancel event | ✅ |
| View event analytics | ✅ |

### Bookings
| Feature | Status |
|---|---|
| View all bookings platform-wide | ✅ |
| Search & filter bookings | ✅ |
| Resend booking confirmation email | ✅ |

### Payouts
| Feature | Status |
|---|---|
| View all organiser payouts | ✅ |
| Process organiser payout (Stripe transfer) | ✅ |
| View payout status & logs | ✅ |
| View all promoter payouts | ✅ |
| Process promoter payout | ✅ |
| Override payout status manually | ✅ |

### Refunds
| Feature | Status |
|---|---|
| View all refund requests | ✅ |
| Approve refund request | ✅ |
| Reject refund request (with reason) | ✅ |
| Process Stripe refund | ✅ |

### Financial Reporting
| Feature | Status |
|---|---|
| Revenue dashboard (gross, net, fee breakdown) | ✅ |
| Export bookings as CSV | ✅ |
| Export revenue as CSV | ✅ |
| Export payouts as CSV | ✅ |
| Export audit log as CSV | ✅ |

### Content Management
| Feature | Status |
|---|---|
| Manage event categories (add, edit, reorder, images) | ✅ |
| Manage cities (add, edit, reorder, images) | ✅ |
| SEO metadata per page (title, description) | ✅ |
| Platform-wide settings | ✅ |
| Create / manage promo codes | ✅ |

### Support
| Feature | Status |
|---|---|
| View all support tickets | ✅ |
| Reply to support tickets | ✅ |
| Update ticket status | ✅ |

### Audit & Compliance
| Feature | Status |
|---|---|
| Audit log (all admin actions recorded) | ✅ |
| Action type, entity, actor tracked | ✅ |
| Queryable audit trail | ✅ |

### Notifications
| Feature | Status |
|---|---|
| Admin notification inbox | ✅ |

---

## Platform-Wide Features

| Feature | Status |
|---|---|
| Row-Level Security (RLS) on all tables | ✅ |
| 4 Supabase client types (browser, server, service, admin) | ✅ |
| Stripe webhook handler (8 event types: payment, transfer, identity, connect) | ✅ |
| 19 transactional email templates (React Email + Resend) | ✅ |
| QR code ticketing (generate + scan) | ✅ |
| PDF ticket generation (browser HTML-to-print) | ✅ |
| Booking reference auto-generation (HXL-XXXXXX) | ✅ |
| In-app notification system (5 roles) | ✅ |
| Vercel cron jobs (end-events 03:00 UTC, event-reminders 09:00 UTC) | ✅ |
| Google Analytics integration | ✅ |
| Vercel Analytics + Speed Insights | ✅ |
| Dark mode support across UI | ✅ |
| Mobile-responsive design | ✅ |

---

## Summary Count

| Role | Total Features | Status |
|---|---|---|
| Public / Guest | 24 | All ✅ |
| Auth | 8 | All ✅ |
| User | 35 | All ✅ |
| Organiser | 62 | All ✅ |
| Promoter | 20 | All ✅ |
| Admin | 55 | All ✅ |
| Platform-Wide | 14 | All ✅ |
| **Total** | **218** | **All ✅** |

---

*Generated: May 2026 — Based on full codebase audit.*

---

## Spec vs Built — Client Comparison

> Original spec document sent to client at project start. Updated with current decisions.
>
> **Legend**: ✅ Built · 🔨 To Build · ⏭️ Next Phase · 🚫 Not Needed · 🤔 To Decide

### Spec Items — Status Update

| # | Spec Feature | Status | Decision |
|---|---|---|---|
| 1 | Klarna BNPL | ✅ | Already available via Stripe payment element |
| 2 | Apple / Google Wallet | ⏭️ | Requires Apple/Google developer account — next phase |
| 3 | Recommended events (based on booking history) | ✅ | Built — personalised section on home page |
| 4 | SMS notifications | ⏭️ | Next phase — not needed for launch |
| 5 | Saved payment methods | 🚫 | Not needed — Stripe handles this natively |
| 6 | GDPR data export (right to portability) | ✅ | Built — sends JSON export via email |
| 7 | Recurring events (weekly / monthly) | 🤔 | To decide |
| 8 | Traffic source analytics | ✅ | Google Analytics already integrated |
| 9 | Conversion rate analytics | 🤔 | To decide |
| 10 | Demographic analytics (age, location, device) | 🤔 | To decide |
| 11 | Downloadable invoices for organisers | ✅ | Built — HTML invoice auto-prints to PDF |
| 12 | Event flagging for moderation | 🤔 | To decide |
| 13 | Event approval before publishing | 🚫 | Not needed — events go live on publish |
| 14 | Email template management in admin | 🚫 | Hardcoded templates are sufficient |
| 15 | 24h before event reminder emails | ✅ | Built — daily cron at 09:00 UTC |
| 16 | Waitlist auto-notification when tickets available | ✅ | Built — triggers on refund/cancellation |
| 17 | Postcode radius search | ✅ | Built — postcodes.io geocoding + haversine filter |

### To Build — Summary

All spec items have been built. ✅

### To Decide

| Feature | Question |
|---|---|
| Recurring events | Is there demand from organisers? Weekly/monthly gig nights etc. |
| Conversion rate analytics | Can be approximated with GA events — is a custom dashboard needed? |
| Demographic analytics | Data availability is limited without third-party — how important? |
| Event flagging | Do we expect enough user-reported content to need this at launch? |

### Extra — Built Beyond Spec

These were not in the original spec but have been delivered:

| Feature | Notes |
|---|---|
| Full Promoter / Affiliate system | Referral links, click tracking, commission, payouts — entirely new role |
| Door staff role (separate from co-organiser) | Granular check-in only access |
| Support ticket system (all roles) | Full threaded support inbox |
| Cities management (admin) | City list with images for homepage |
| SEO metadata management (admin) | Per-page SEO from admin panel |
| Comp code generation per event | Complimentary ticket codes |
| In-app notification inbox (all roles) | Beyond email-only spec |
| Organiser cross-event bookings view | All bookings in one place |
| Admin promoter management | Approve/suspend/reinstate promoters |
