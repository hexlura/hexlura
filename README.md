# Hexlura

UK-based event ticket booking platform built with Next.js 14, Supabase, and Stripe.

## Live Site
[hexlura.com](https://hexlura.com)

## Tech Stack
- **Framework**: Next.js 14 (App Router) + TypeScript
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (email/password + Google OAuth)
- **Payments**: Stripe UK + Stripe Connect
- **Styling**: Tailwind CSS
- **Hosting**: Vercel
- **Email**: Resend
- **Storage**: Supabase Storage

## Platform Areas
- **Public** — Event discovery, browsing, event detail pages
- **Buyer** — Registration, checkout, PDF tickets, booking history
- **Organiser** — Event creation, attendee management, QR check-in, payouts
- **Admin** — User/organiser management, event moderation, financials

## Environment Variables
Copy `.env.local.example` to `.env.local` and fill in:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=
```

## Getting Started
```bash
npm install
npm run dev
```

## Database
Migrations are in `/supabase/migrations/`. 
Run against your Supabase project via the SQL Editor.

## Deployment
Connected to Vercel — every push to `main` deploys automatically.
