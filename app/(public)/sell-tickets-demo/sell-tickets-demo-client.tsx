'use client'

import Link from 'next/link'
import { RevenueCalculator } from '@/components/organiser/RevenueCalculator'

// ─── SVG Icons ───────────────────────────────────────────────────────────────

function IconUser() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function IconStripe() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function IconPayout() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

function IconTicket() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <line x1="9" y1="2" x2="9" y2="22" strokeDasharray="3 3" />
    </svg>
  )
}

function IconQR() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="3" height="3" />
      <line x1="19" y1="14" x2="21" y2="14" />
      <line x1="19" y1="17" x2="21" y2="17" />
      <line x1="19" y1="20" x2="21" y2="20" />
    </svg>
  )
}

function IconChart() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  )
}

function IconTag() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="3" />
    </svg>
  )
}

function IconGroup() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconBank() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}

function IconMegaphone() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l18-5v12L3 13v-2z" />
      <path d="M11.6 16.8a3 3 0 0 1-5.8-1.6" />
    </svg>
  )
}

function IconRepeat() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  )
}

function IconShield() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  )
}

function IconHeadset() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  )
}

function IconChevron() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SellTicketsDemoClient({ ctaHref }: { ctaHref: string }) {
  const steps = [
    { num: '01', icon: <IconUser />, title: 'CREATE ACCOUNT', desc: 'Sign up free in seconds. No credit card required. Instant organiser access.' },
    { num: '02', icon: <IconStripe />, title: 'SET UP PAYOUTS', desc: 'Connect your bank account via Stripe when you\'re ready to receive payments. Simple, secure, takes 2 minutes.' },
    { num: '03', icon: <IconCalendar />, title: 'CREATE YOUR EVENT', desc: 'Add your event details, upload a banner, set ticket types and prices. Go live instantly.' },
    { num: '04', icon: <IconPayout />, title: 'GET PAID', desc: 'Sell tickets. We handle payments. You receive 100% of face value 2 business days after your event.' },
  ]

  const featureGroups = [
    {
      label: 'Ticketing & Events',
      color: '#E63950',
      items: [
        { icon: <IconTicket />, title: 'Instant Ticket Sales', desc: 'Go live the moment you publish — no approval delays.' },
        { icon: <IconTag />, title: 'Multiple Ticket Types', desc: 'Early bird, VIP, general admission — unlimited tiers per event.' },
        { icon: <IconGroup />, title: 'Group Tickets', desc: 'Sell group packages with an individual QR code per member.' },
        { icon: <IconRepeat />, title: 'Waitlists', desc: 'Automatically notify fans the moment a sold-out event frees up tickets.' },
      ],
    },
    {
      label: 'Marketing & Promotion',
      color: '#F5A623',
      items: [
        { icon: <IconTag />, title: 'Promo Codes', desc: 'Fixed or percentage discounts for early birds, press, or VIPs.' },
        { icon: <IconMegaphone />, title: 'Promoter Links', desc: 'Recruit promoters with trackable referral links and automated commission payouts.' },
        { icon: <IconChart />, title: 'Featured Placement', desc: 'Get discovered on the homepage and category browse pages.' },
      ],
    },
    {
      label: 'Analytics & Check-in',
      color: '#00C48A',
      items: [
        { icon: <IconChart />, title: 'Real-Time Analytics', desc: 'Track sales, revenue and attendance live from your dashboard.' },
        { icon: <IconQR />, title: 'QR Code Check-In', desc: 'Every ticket gets a unique QR code, scanned via the built-in door app.' },
        { icon: <IconUser />, title: 'Door Staff Accounts', desc: 'Give check-in-only access to staff without exposing your full dashboard.' },
      ],
    },
    {
      label: 'Payments & Support',
      color: '#3B82F6',
      items: [
        { icon: <IconBank />, title: 'Fast Payouts', desc: 'Receive your earnings 2 business days after your event ends, directly to your bank.' },
        { icon: <IconShield />, title: 'Secure Stripe Payments', desc: 'PCI-compliant checkout with Stripe Elements — no card data touches our servers.' },
        { icon: <IconHeadset />, title: 'Organiser Support', desc: 'Real humans on email and support tickets when you need help.' },
      ],
    },
  ]

  const testimonials = [
    { quote: 'Hexlura made selling tickets for our club night ridiculously simple. Setup took 10 minutes and payouts hit our account 2 days after the event.', name: 'DJ Marcus T', role: 'Club Night Organiser, Manchester', initials: 'MT' },
    { quote: 'Finally a UK platform that doesn\'t take a cut of our ticket revenue. The organiser dashboard is clean and the QR check-in works perfectly.', name: 'Sarah K', role: 'Event Company, London', initials: 'SK' },
    { quote: 'We switched from Eventbrite and saved hundreds in fees. The clean design matches our brand perfectly and our customers love it.', name: 'Raj P', role: 'Festival Organiser, Birmingham', initials: 'RP' },
  ]

  const faqs = [
    { q: 'Is it really free to host events on Hexlura?', a: 'Yes. There\'s no setup fee and no monthly subscription. You only ever deal in ticket revenue — the platform fee is added on top of the ticket price and paid by the buyer, not deducted from you.' },
    { q: 'How much does the buyer pay in fees?', a: 'A small booking fee (a percentage of the ticket price, with a minimum and maximum cap) is added at checkout. It\'s shown to the buyer before they pay — you keep 100% of your ticket price.' },
    { q: 'When do I get paid?', a: 'Payouts are released 2 business days after your event ends, straight to the bank account you connect via Stripe.' },
    { q: 'How does check-in work on the day?', a: 'Every ticket gets a unique QR code. Use the built-in door scanner on any phone or tablet — no extra hardware or app download required. You can also give check-in-only access to door staff.' },
    { q: 'Can I offer discounts or group tickets?', a: 'Yes — create promo codes (fixed or percentage) for early birds, press or VIPs, and sell group packages that generate an individual QR code per attendee.' },
    { q: 'What if I need help setting up my event?', a: 'Our support team is reachable by email and support ticket, and we publish an organiser guide covering setup, payouts and check-in best practice.' },
  ]

  return (
    <div style={{ background: '#FFFFFF', color: '#0A0A0F' }}>

      {/* ── SECTION 1: HERO (two-column: copy + live calculator) ──────────── */}
      <section style={{
        background: 'radial-gradient(ellipse 90% 60% at 50% -10%, rgba(230,57,80,0.08), transparent)',
        padding: 'clamp(72px, 10vw, 120px) 24px 80px',
      }}>
        <div className="sell-hero-grid" style={{
          maxWidth: 1180,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1.05fr 0.95fr',
          gap: '48px',
          alignItems: 'center',
        }}>
          {/* Left: copy */}
          <div>
            <p style={{
              fontSize: 12, color: '#E63950', letterSpacing: 4, fontWeight: 600,
              textTransform: 'uppercase', marginBottom: 20, fontFamily: 'DM Sans, sans-serif',
            }}>
              For Event Organisers
            </p>

            <h1 style={{ margin: 0, lineHeight: 1, marginBottom: 8 }}>
              <span style={{
                display: 'block', fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif',
                fontSize: 'clamp(48px, 6.5vw, 84px)', color: '#0A0A0F', letterSpacing: 2,
              }}>
                SELL TICKETS.
              </span>
              <span style={{
                display: 'block', fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif',
                fontSize: 'clamp(48px, 6.5vw, 84px)', color: '#E63950', letterSpacing: 2,
              }}>
                KEEP EVERYTHING.
              </span>
            </h1>

            <p style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: 19, color: '#666677',
              maxWidth: 480, lineHeight: 1.6, margin: '24px 0',
            }}>
              The UK&apos;s most organiser-friendly ticketing platform. Zero monthly fees.
              You keep 100% of your ticket price — always.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
              <Link href={ctaHref} style={{
                background: '#0A0A0F', color: '#FFFFFF', padding: '16px 32px', fontSize: 16,
                fontWeight: 600, borderRadius: 2, textDecoration: 'none', fontFamily: 'DM Sans, sans-serif',
                display: 'inline-block',
              }}>
                Start Selling Tickets
              </Link>
              <a href="#how-it-works" style={{
                border: '1px solid #C0C0C8', color: '#0A0A0F', padding: '16px 32px', fontSize: 16,
                borderRadius: 2, textDecoration: 'none', fontFamily: 'DM Sans, sans-serif', display: 'inline-block',
              }}>
                See How It Works
              </a>
            </div>

            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#666677', marginTop: 20 }}>
              No setup fees · No monthly subscription · Instant approval
            </p>
          </div>

          {/* Right: live revenue calculator, dark card, sits directly in the hero */}
          <div style={{
            background: '#0A0A0F', borderRadius: 24, padding: 8,
            boxShadow: '0 24px 60px rgba(10,10,15,0.25)',
          }}>
            <RevenueCalculator
              accentColor="#E63950"
              glowColor="#E63950"
              glowIntensity={0.28}
              glassTint={0.06}
              innerTint={0.04}
              showCta
              ctaHref={ctaHref}
              ctaLabel="Create Event"
              maxWidth="100%"
            />
          </div>
        </div>
      </section>

      {/* ── SECTION 2: STATS BAR ────────────────────────────────────────── */}
      <section style={{ background: '#F0F0F0', borderTop: '1px solid #C0C0C8', borderBottom: '1px solid #C0C0C8', padding: '32px 24px' }}>
        <div className="sell-stats-grid" style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }}>
          {[
            { value: '£0', label: 'Monthly Fee' },
            { value: '100%', label: 'Ticket Price Yours' },
            { value: '2 Days', label: 'Payout After Event' },
            { value: '24/7', label: 'Platform Access' },
          ].map((stat, i) => (
            <div key={stat.label} style={{ textAlign: 'center', padding: '16px 24px', borderLeft: i > 0 ? '1px solid #C0C0C8' : 'none' }}>
              <div style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 48, color: '#E63950', lineHeight: 1, marginBottom: 8 }}>
                {stat.value}
              </div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#666677', textTransform: 'uppercase', letterSpacing: 1 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 3: PRODUCT VISUAL (stylised dashboard mock) ─────────── */}
      <section style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#E63950', letterSpacing: 4, textTransform: 'uppercase', marginBottom: 12 }}>
            Your Dashboard
          </p>
          <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 'clamp(36px, 5vw, 56px)', color: '#0A0A0F', margin: '0 0 20px', letterSpacing: 1 }}>
            EVERYTHING IN ONE PLACE
          </h2>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#666677', maxWidth: 560, margin: '0 auto 56px', lineHeight: 1.6 }}>
            Sales, check-ins, payouts and analytics — live, in one organiser dashboard.
          </p>

          <div style={{
            background: '#0A0A0F', borderRadius: 20, padding: 'clamp(20px, 3vw, 32px)',
            boxShadow: '0 24px 60px rgba(10,10,15,0.18)', textAlign: 'left',
          }}>
            <div className="sell-dash-grid" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16 }}>
              {/* Fake bar chart card */}
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Ticket Sales — Last 7 Days
                  </span>
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#00C48A', fontWeight: 600 }}>▲ 18%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 140 }}>
                  {[38, 55, 42, 70, 60, 88, 100].map((h, i) => (
                    <div key={i} style={{
                      flex: 1, height: `${h}%`, borderRadius: '4px 4px 0 0',
                      background: i === 6 ? '#E63950' : 'rgba(230,57,80,0.35)',
                    }} />
                  ))}
                </div>
              </div>

              {/* Fake stat tiles */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { label: 'Tickets Sold', value: '1,284' },
                  { label: 'Revenue', value: '£24,610' },
                  { label: 'Checked In', value: '312' },
                  { label: 'Payout Due', value: '£24,610' },
                ].map(tile => (
                  <div key={tile.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '18px 16px' }}>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                      {tile.label}
                    </div>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 22, fontWeight: 700, color: '#FFFFFF' }}>
                      {tile.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fake attendee/check-in row */}
            <div style={{ marginTop: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 24px' }}>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
                Recent Check-Ins
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { name: 'Amelia R.', ticket: 'General Admission', time: '21:42' },
                  { name: 'James O.', ticket: 'VIP', time: '21:40' },
                  { name: 'Priya S.', ticket: 'General Admission', time: '21:38' },
                ].map(row => (
                  <div key={row.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'DM Sans, sans-serif', fontSize: 14 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.85)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00C48A', display: 'inline-block' }} />
                      {row.name}
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>· {row.ticket}</span>
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>{row.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#A0A0A8', marginTop: 16 }}>
            Illustrative preview — actual dashboard layout may vary.
          </p>
        </div>
      </section>

      {/* ── SECTION 4: HOW IT WORKS ─────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: '100px 24px', background: '#F5F5F7', borderTop: '1px solid #C0C0C8' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#E63950', letterSpacing: 4, textTransform: 'uppercase', textAlign: 'center', marginBottom: 12 }}>
            Simple Process
          </p>
          <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 56, color: '#0A0A0F', textAlign: 'center', margin: '0 0 64px', letterSpacing: 1 }}>
            UP AND RUNNING IN MINUTES
          </h2>

          <div className="sell-steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {steps.map(step => (
              <div key={step.num} style={{ background: '#FFFFFF', border: '1px solid #C0C0C8', padding: 32, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 16, right: 20, fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 64, color: '#C0C0C8', lineHeight: 1, userSelect: 'none' }}>
                  {step.num}
                </div>
                <div style={{ color: '#E63950', marginBottom: 16 }}>{step.icon}</div>
                <h3 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 24, color: '#0A0A0F', margin: '0 0 12px', letterSpacing: 0.5 }}>
                  {step.title}
                </h3>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#666677', lineHeight: 1.7, margin: 0 }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5: FEATURES (grouped by category) ───────────────────── */}
      <section style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#E63950', letterSpacing: 4, textTransform: 'uppercase', textAlign: 'center', marginBottom: 12 }}>
            Everything You Need
          </p>
          <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 56, color: '#0A0A0F', textAlign: 'center', margin: '0 0 64px', letterSpacing: 1 }}>
            BUILT FOR UK ORGANISERS
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
            {featureGroups.map(group => (
              <div key={group.label}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: group.color, display: 'inline-block' }} />
                  <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 700, color: '#0A0A0F', textTransform: 'uppercase', letterSpacing: 1.5, margin: 0 }}>
                    {group.label}
                  </h3>
                </div>
                <div className="sell-features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                  {group.items.map(feature => (
                    <div key={feature.title} style={{ background: '#F5F5F7', border: '1px solid #C0C0C8', padding: 24, transition: 'border-color 0.2s' }}>
                      <div style={{ width: 48, height: 48, background: '#FFFFFF', border: '1px solid #C0C0C8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, color: group.color }}>
                        {feature.icon}
                      </div>
                      <h4 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#0A0A0F', fontWeight: 600, margin: '0 0 8px' }}>
                        {feature.title}
                      </h4>
                      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#666677', lineHeight: 1.6, margin: 0 }}>
                        {feature.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 6: TESTIMONIALS ─────────────────────────────────────── */}
      <section style={{ padding: '100px 24px', background: '#F5F5F7', borderTop: '1px solid #C0C0C8' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#E63950', letterSpacing: 4, textTransform: 'uppercase', textAlign: 'center', marginBottom: 12 }}>
            Organiser Stories
          </p>
          <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 56, color: '#0A0A0F', textAlign: 'center', margin: '0 0 64px', letterSpacing: 1 }}>
            TRUSTED BY UK ORGANISERS
          </h2>

          <div className="sell-testimonials-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {testimonials.map(t => (
              <div key={t.name} style={{ background: '#FFFFFF', border: '1px solid #C0C0C8', padding: 32 }}>
                <div style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 80, color: '#E63950', opacity: 0.3, lineHeight: 0.8, marginBottom: 16, userSelect: 'none' }}>
                  &ldquo;
                </div>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#0A0A0F', lineHeight: 1.7, fontStyle: 'italic', marginBottom: 24 }}>
                  {t.quote}
                </p>
                <div style={{ borderTop: '1px solid #C0C0C8', marginBottom: 20 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#C0C0C8', color: '#0A0A0F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                    {t.initials}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#0A0A0F', fontWeight: 600 }}>{t.name}</div>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#666677' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 7: FAQ ───────────────────────────────────────────────── */}
      <section style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#E63950', letterSpacing: 4, textTransform: 'uppercase', textAlign: 'center', marginBottom: 12 }}>
            Questions
          </p>
          <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 56, color: '#0A0A0F', textAlign: 'center', margin: '0 0 56px', letterSpacing: 1 }}>
            FREQUENTLY ASKED
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {faqs.map(faq => (
              <details key={faq.q} className="sell-faq-item" style={{ background: '#F5F5F7', border: '1px solid #C0C0C8', padding: '20px 24px' }}>
                <summary style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif', fontSize: 16, fontWeight: 600, color: '#0A0A0F', listStyle: 'none',
                }}>
                  {faq.q}
                  <span className="sell-faq-chevron" style={{ color: '#E63950', display: 'flex', flexShrink: 0, marginLeft: 16, transition: 'transform 0.2s' }}>
                    <IconChevron />
                  </span>
                </summary>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#666677', lineHeight: 1.7, margin: '16px 0 0' }}>
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 8: FINAL CTA ────────────────────────────────────────── */}
      <section style={{
        padding: 'clamp(80px, 10vw, 120px) 24px',
        background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(230,57,80,0.06), transparent)',
        borderTop: '1px solid #C0C0C8', textAlign: 'center',
      }}>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#E63950', letterSpacing: 4, textTransform: 'uppercase', marginBottom: 16 }}>
          Join Hexlura
        </p>
        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 'clamp(48px, 8vw, 72px)', color: '#0A0A0F', margin: 0, letterSpacing: 1, lineHeight: 1 }}>
          READY TO START SELLING?
        </h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, color: '#666677', maxWidth: 500, margin: '16px auto 40px', lineHeight: 1.6 }}>
          Join hundreds of UK organisers already selling on Hexlura. Free to start. No contracts. Cancel anytime.
        </p>
        <Link href={ctaHref} style={{
          display: 'inline-block', background: '#E63950', color: '#fff', padding: '18px 48px', fontSize: 18,
          fontWeight: 600, borderRadius: 2, textDecoration: 'none', fontFamily: 'DM Sans, sans-serif',
        }}>
          Create Your Free Account
        </Link>
        <div style={{ marginTop: 16 }}>
          <Link href="/auth/login" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#666677', textDecoration: 'none' }}>
            Already have an account? <span style={{ color: '#E63950' }}>Sign in →</span>
          </Link>
        </div>
      </section>

      {/* ── Responsive styles ───────────────────────────────────────────── */}
      <style>{`
        .sell-faq-item summary::-webkit-details-marker { display: none; }
        .sell-faq-item[open] .sell-faq-chevron { transform: rotate(180deg); }

        @media (max-width: 1024px) {
          .sell-hero-grid {
            grid-template-columns: 1fr !important;
          }
          .sell-dash-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 900px) {
          .sell-steps-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .sell-features-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .sell-testimonials-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 600px) {
          .sell-stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .sell-stats-grid > div {
            border-left: none !important;
            border-top: 1px solid #C0C0C8;
          }
          .sell-stats-grid > div:nth-child(even) {
            border-left: 1px solid #C0C0C8 !important;
          }
          .sell-steps-grid {
            grid-template-columns: 1fr !important;
          }
          .sell-features-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

    </div>
  )
}
