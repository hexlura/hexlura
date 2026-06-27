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
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <line x1="9" y1="2" x2="9" y2="22" strokeDasharray="3 3" />
    </svg>
  )
}

function IconQR() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  )
}

function IconTag() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="3" />
    </svg>
  )
}

function IconGroup() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconBank() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SellTicketsClient({ ctaHref }: { ctaHref: string }) {
  const steps = [
    {
      num: '01',
      icon: <IconUser />,
      title: 'CREATE ACCOUNT',
      desc: 'Sign up free in seconds. No credit card required. Instant organiser access.',
    },
    {
      num: '02',
      icon: <IconStripe />,
      title: 'SET UP PAYOUTS',
      desc: 'When you\'re ready to receive payments, connect your bank account via Stripe. Simple, secure, takes 2 minutes.',
    },
    {
      num: '03',
      icon: <IconCalendar />,
      title: 'CREATE YOUR EVENT',
      desc: 'Add your event details, upload a banner, set ticket types and prices. Go live instantly.',
    },
    {
      num: '04',
      icon: <IconPayout />,
      title: 'GET PAID',
      desc: 'Sell tickets. We handle payments. You receive 100% of face value 2 business days after your event.',
    },
  ]

  const features = [
    {
      icon: <IconTicket />,
      iconColor: '#E63950',
      title: 'Instant Ticket Sales',
      desc: 'Go live the moment you publish. Start selling tickets immediately with no approval delays.',
    },
    {
      icon: <IconQR />,
      iconColor: '#E63950',
      title: 'QR Code Tickets',
      desc: 'Every ticket gets a unique QR code. Use our built-in door scanner to check in attendees.',
    },
    {
      icon: <IconChart />,
      iconColor: '#F5A623',
      title: 'Real-Time Analytics',
      desc: 'Track sales, revenue, and attendance in real time from your organiser dashboard.',
    },
    {
      icon: <IconTag />,
      iconColor: '#F5A623',
      title: 'Promo Codes',
      desc: 'Create discount codes for early birds, press, or VIPs. Fixed or percentage discounts.',
    },
    {
      icon: <IconGroup />,
      iconColor: '#00C48A',
      title: 'Group Tickets',
      desc: 'Sell group packages with individual QR codes generated for each member of the group.',
    },
    {
      icon: <IconBank />,
      iconColor: '#00C48A',
      title: 'Fast Payouts',
      desc: 'Receive your earnings 2 business days after your event ends, directly to your bank.',
    },
  ]

  const testimonials = [
    {
      quote: 'Hexlura made selling tickets for our club night ridiculously simple. Setup took 10 minutes and payouts hit our account 2 days after the event.',
      name: 'DJ Marcus T',
      role: 'Club Night Organiser, Manchester',
      initials: 'MT',
    },
    {
      quote: 'Finally a UK platform that doesn\'t take a cut of our ticket revenue. The organiser dashboard is clean and the QR check-in works perfectly.',
      name: 'Sarah K',
      role: 'Event Company, London',
      initials: 'SK',
    },
    {
      quote: 'We switched from Eventbrite and saved hundreds in fees. The clean design matches our brand perfectly and our customers love it.',
      name: 'Raj P',
      role: 'Festival Organiser, Birmingham',
      initials: 'RP',
    },
  ]

  return (
    <div style={{ background: '#FFFFFF', color: '#0A0A0F' }}>

      {/* ── SECTION 1: HERO ─────────────────────────────────────────────── */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(230,57,80,0.08), transparent)',
        padding: '80px 24px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 720 }}>
          <p style={{
            fontSize: 12,
            color: '#E63950',
            letterSpacing: 4,
            fontWeight: 600,
            textTransform: 'uppercase',
            marginBottom: 24,
            fontFamily: 'DM Sans, sans-serif',
          }}>
            For Event Organisers
          </p>

          <h1 style={{ margin: 0, lineHeight: 1, marginBottom: 8 }}>
            <span style={{
              display: 'block',
              fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif',
              fontSize: 'clamp(56px, 10vw, 96px)',
              color: '#0A0A0F',
              letterSpacing: 2,
            }}>
              SELL TICKETS.
            </span>
            <span style={{
              display: 'block',
              fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif',
              fontSize: 'clamp(56px, 10vw, 96px)',
              color: '#E63950',
              letterSpacing: 2,
            }}>
              KEEP EVERYTHING.
            </span>
          </h1>

          <p style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 20,
            color: '#666677',
            maxWidth: 560,
            lineHeight: 1.6,
            margin: '24px auto',
          }}>
            The UK&apos;s most organiser-friendly ticketing platform. Zero monthly fees. You keep 100% of face value. Always.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 32 }}>
            <Link
              href={ctaHref}
              style={{
                background: '#0A0A0F',
                color: '#ffffffff',
                padding: '16px 32px',
                fontSize: 16,
                fontWeight: 600,
                borderRadius: 2,
                textDecoration: 'none',
                fontFamily: 'DM Sans, sans-serif',
                display: 'inline-block',
              }}
            >
              Start Selling Tickets
            </Link>
            <a
              href="#how-it-works"
              style={{
                border: '1px solid #C0C0C8',
                color: '#0A0A0F',
                padding: '16px 32px',
                fontSize: 16,
                borderRadius: 2,
                textDecoration: 'none',
                fontFamily: 'DM Sans, sans-serif',
                display: 'inline-block',
                transition: 'border-color 0.2s',
              }}
              onMouseOver={e => (e.currentTarget.style.borderColor = '#0A0A0F')}
              onMouseOut={e => (e.currentTarget.style.borderColor = '#C0C0C8')}
            >
              See How It Works
            </a>
          </div>

          <p style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 13,
            color: '#666677',
            marginTop: 20,
          }}>
            No setup fees · No monthly subscription · Instant approval
          </p>
        </div>
      </section>


      {/* ── SECTION 2: REVENUE CALCULATOR ───────────────────────────────── */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '100px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          maxWidth: 1200,
          width: '100%',
          margin: '0 auto',
          position: 'relative',
          zIndex: 2,
        }}>
          <div className="sell-calculator-container">
            {/* Left Column: Reference Image Content */}
            <div className="sell-calc-left" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              textAlign: 'left',
            }}>
              <h2 style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 'clamp(26px, 5vw, 46px)',
                fontWeight: 600,
                fontStyle: 'bold',
                lineHeight: 1.1,
                letterSpacing: '-1.5px',
                color: '#0A0A0F',
                margin: 0,
              }}>
                <span style={{ color: '#E63950' }}>Start hosting</span> your events <br /> today
              </h2>

              {/* Earn Row */}
              <div style={{
                background: 'rgba(230, 57, 80, 0.04)',
                border: '1px solid rgba(230, 57, 80, 0.25)',
                borderRadius: '12px',
                padding: '16px 20px',
                fontSize: '16px',
                fontWeight: 500,
                color: '#0A0A0F',
                fontFamily: 'DM Sans, sans-serif',
                display: 'flex',
                alignItems: 'center',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
              }}>
                <span>Earn <strong style={{ color: '#E63950', fontWeight: 700 }}>5% extra</strong> on every ticket sold</span>
              </div>

              {/* List Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Card 1 */}
                <div style={{
                  background: '#FFFFFF',
                  border: '1px solid rgba(12, 12, 16, 0.08)',
                  borderRadius: '16px',
                  padding: '20px 24px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '20px',
                  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)',
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(230, 57, 80, 0.08)',
                    color: '#E63950',
                    flexShrink: 0,
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <h3 style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '18px',
                      fontWeight: 600,
                      color: '#0A0A0F',
                      margin: 0,
                    }}>
                      Host for Free, Everything Unlocked
                    </h3>
                    <p style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '14px',
                      color: 'rgba(10, 10, 15, 0.6)',
                      lineHeight: '1.5',
                      margin: 0,
                    }}>
                      Access all features – unlimited events, ticket types, promos, and check-ins at no cost.
                    </p>
                  </div>
                </div>

                {/* Card 2 */}
                <div style={{
                  background: '#FFFFFF',
                  border: '1px solid rgba(12, 12, 16, 0.08)',
                  borderRadius: '16px',
                  padding: '20px 24px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '20px',
                  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)',
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(59, 130, 246, 0.08)',
                    color: '#3B82F6',
                    flexShrink: 0,
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 18H6l3-6V8a3 3 0 1 1 6 0" />
                      <line x1="6" y1="12" x2="13" y2="12" />
                    </svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <h3 style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '18px',
                      fontWeight: 600,
                      color: '#0A0A0F',
                      margin: 0,
                    }}>
                      Fast Payouts
                    </h3>
                    <p style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '14px',
                      color: 'rgba(10, 10, 15, 0.6)',
                      lineHeight: '1.5',
                      margin: 0,
                    }}>
                      Get paid within 48 hours of your event.
                    </p>
                  </div>
                </div>

                {/* Card 3 */}
                <div style={{
                  background: '#FFFFFF',
                  border: '1px solid rgba(12, 12, 16, 0.08)',
                  borderRadius: '16px',
                  padding: '20px 24px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '20px',
                  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)',
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(236, 72, 153, 0.08)',
                    color: '#EC4899',
                    flexShrink: 0,
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                      <path d="M22 12A10 10 0 0 0 12 2v10z" />
                    </svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <h3 style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '18px',
                      fontWeight: 600,
                      color: '#0A0A0F',
                      margin: 0,
                    }}>
                      Live Sales Analytics
                    </h3>
                    <p style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '14px',
                      color: 'rgba(10, 10, 15, 0.6)',
                      lineHeight: '1.5',
                      margin: 0,
                    }}>
                      Track sales, scans and earnings in real time.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Revenue Calculator */}
            <div className="sell-calc-right" style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <RevenueCalculator
                accentColor="#E63950"
                glowColor="#E63950"
                glowIntensity={0.22}
                glassTint={0.08}
                innerTint={0.05}
                showCta={false}
                ctaTextColor="#FFFFFF"
                titleColor='#0A0A0F'
                subtitleColor='#666677'
                rowLabelColor='#0A0A0F'
                rowValueColor='#000000ff'
              />
            </div>

            {/* Bottom Row / Container: Create Event Button */}
            <div className="sell-calc-btn-container">
              <Link
                href={ctaHref}
                className="sell-calc-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: '#0A0A0F',
                  color: '#FFFFFF',
                  borderRadius: 2,
                  padding: '16px 32px',
                  fontSize: '16px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  fontFamily: 'DM Sans, sans-serif',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseOver={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.25)'
                }}
                onMouseOut={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.15)'
                }}
              >
                Create Event
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>


      {/* ── SECTION 3: STATS BAR ────────────────────────────────────────── */}
      <section style={{
        background: '#F0F0F0',
        borderTop: '1px solid #C0C0C8',
        borderBottom: '1px solid #C0C0C8',
        padding: '32px 24px',
      }}>
        <div style={{
          maxWidth: 900,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 0,
        }}
          className="sell-stats-grid"
        >
          {[
            { value: '£0', label: 'Monthly Fee' },
            { value: '100%', label: 'Face Value Yours' },
            { value: '2 Days', label: 'Payout After Event' },
            { value: '24/7', label: 'Platform Access' },
          ].map((stat, i) => (
            <div key={stat.label} style={{
              textAlign: 'center',
              padding: '16px 24px',
              borderLeft: i > 0 ? '1px solid #C0C0C8' : 'none',
            }}>
              <div style={{
                fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif',
                fontSize: 48,
                color: '#E63950',
                lineHeight: 1,
                marginBottom: 8,
              }}>
                {stat.value}
              </div>
              <div style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 13,
                color: '#666677',
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 4: HOW IT WORKS ─────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 12,
            color: '#E63950',
            letterSpacing: 4,
            textTransform: 'uppercase',
            textAlign: 'center',
            marginBottom: 12,
          }}>
            Simple Process
          </p>
          <h2 style={{
            fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif',
            fontSize: 56,
            color: '#0A0A0F',
            textAlign: 'center',
            margin: '0 0 64px',
            letterSpacing: 1,
          }}>
            UP AND RUNNING IN MINUTES
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 16,
          }}
            className="sell-steps-grid"
          >
            {steps.map(step => (
              <div
                key={step.num}
                style={{
                  background: '#F5F5F7',
                  border: '1px solid #C0C0C8',
                  padding: 32,
                  position: 'relative',
                  transition: 'border-color 0.2s',
                  cursor: 'default',
                }}
                onMouseOver={e => (e.currentTarget.style.borderColor = '#E63950')}
                onMouseOut={e => (e.currentTarget.style.borderColor = '#C0C0C8')}
              >
                <div style={{
                  position: 'absolute',
                  top: 16,
                  right: 20,
                  fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif',
                  fontSize: 64,
                  color: '#C0C0C8',
                  lineHeight: 1,
                  userSelect: 'none',
                }}>
                  {step.num}
                </div>
                <div style={{ color: '#E63950', marginBottom: 16 }}>
                  {step.icon}
                </div>
                <h3 style={{
                  fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif',
                  fontSize: 24,
                  color: '#0A0A0F',
                  margin: '0 0 12px',
                  letterSpacing: 0.5,
                }}>
                  {step.title}
                </h3>
                <p style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 14,
                  color: '#666677',
                  lineHeight: 1.7,
                  margin: 0,
                }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 6: FEATURES ─────────────────────────────────────────── */}
      <section style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 12,
            color: '#E63950',
            letterSpacing: 4,
            textTransform: 'uppercase',
            textAlign: 'center',
            marginBottom: 12,
          }}>
            Everything You Need
          </p>
          <h2 style={{
            fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif',
            fontSize: 56,
            color: '#0A0A0F',
            textAlign: 'center',
            margin: '0 0 64px',
            letterSpacing: 1,
          }}>
            BUILT FOR UK ORGANISERS
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
          }}
            className="sell-features-grid"
          >
            {features.map(feature => (
              <div
                key={feature.title}
                style={{
                  background: '#F5F5F7',
                  border: '1px solid #C0C0C8',
                  padding: 32,
                  transition: 'border-color 0.2s',
                  cursor: 'default',
                }}
                onMouseOver={e => (e.currentTarget.style.borderColor = feature.iconColor)}
                onMouseOut={e => (e.currentTarget.style.borderColor = '#C0C0C8')}
              >
                <div style={{
                  width: 56,
                  height: 56,
                  background: '#FFFFFF',
                  border: '1px solid #C0C0C8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 20,
                  color: feature.iconColor,
                }}>
                  {feature.icon}
                </div>
                <h3 style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 18,
                  color: '#0A0A0F',
                  fontWeight: 600,
                  margin: '0 0 12px',
                }}>
                  {feature.title}
                </h3>
                <p style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 14,
                  color: '#666677',
                  lineHeight: 1.7,
                  margin: 0,
                }}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 7: TESTIMONIALS ─────────────────────────────────────── */}
      <section style={{
        padding: '100px 24px',
        background: '#F5F5F7',
        borderTop: '1px solid #C0C0C8',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 12,
            color: '#E63950',
            letterSpacing: 4,
            textTransform: 'uppercase',
            textAlign: 'center',
            marginBottom: 12,
          }}>
            Organiser Stories
          </p>
          <h2 style={{
            fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif',
            fontSize: 56,
            color: '#0A0A0F',
            textAlign: 'center',
            margin: '0 0 64px',
            letterSpacing: 1,
          }}>
            TRUSTED BY UK ORGANISERS
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
          }}
            className="sell-testimonials-grid"
          >
            {testimonials.map(t => (
              <div
                key={t.name}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #C0C0C8',
                  padding: 32,
                }}
              >
                <div style={{
                  fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif',
                  fontSize: 80,
                  color: '#E63950',
                  opacity: 0.3,
                  lineHeight: 0.8,
                  marginBottom: 16,
                  userSelect: 'none',
                }}>
                  &ldquo;
                </div>
                <p style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 16,
                  color: '#0A0A0F',
                  lineHeight: 1.7,
                  fontStyle: 'italic',
                  marginBottom: 24,
                }}>
                  {t.quote}
                </p>
                <div style={{ borderTop: '1px solid #C0C0C8', marginBottom: 20 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: '#C0C0C8',
                    color: '#0A0A0F',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 13,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}>
                    {t.initials}
                  </div>
                  <div>
                    <div style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 14,
                      color: '#0A0A0F',
                      fontWeight: 600,
                    }}>
                      {t.name}
                    </div>
                    <div style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 13,
                      color: '#666677',
                    }}>
                      {t.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 8: FINAL CTA ────────────────────────────────────────── */}
      <section style={{
        padding: 'clamp(80px, 10vw, 120px) 24px',
        background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(230,57,80,0.06), transparent)',
        borderTop: '1px solid #C0C0C8',
        textAlign: 'center',
      }}>
        <p style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 12,
          color: '#E63950',
          letterSpacing: 4,
          textTransform: 'uppercase',
          marginBottom: 16,
        }}>
          Join Hexlura
        </p>
        <h2 style={{
          fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif',
          fontSize: 'clamp(48px, 8vw, 72px)',
          color: '#0A0A0F',
          margin: '0 0 0',
          letterSpacing: 1,
          lineHeight: 1,
        }}>
          READY TO START SELLING?
        </h2>
        <p style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 18,
          color: '#666677',
          maxWidth: 500,
          margin: '16px auto 40px',
          lineHeight: 1.6,
        }}>
          Join hundreds of UK organisers already selling on Hexlura. Free to start. No contracts. Cancel anytime.
        </p>
        <Link
          href={ctaHref}
          style={{
            display: 'inline-block',
            background: '#E63950',
            color: '#fff',
            padding: '18px 48px',
            fontSize: 18,
            fontWeight: 600,
            borderRadius: 2,
            textDecoration: 'none',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          Create Your Free Account
        </Link>
        <div style={{ marginTop: 16 }}>
          <Link
            href="/auth/login"
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 14,
              color: '#666677',
              textDecoration: 'none',
            }}
            onMouseOver={undefined}
          >
            Already have an account?{' '}
            <span style={{ color: '#E63950' }}>Sign in →</span>
          </Link>
        </div>
      </section>

      {/* ── Responsive styles ───────────────────────────────────────────── */}
      <style>{`
        .sell-calculator-container {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 32px 64px;
        }
        .sell-calc-left {
          grid-column: 1;
          grid-row: 1;
        }
        .sell-calc-right {
          grid-column: 2;
          grid-row: 1 / span 2;
          align-self: center;
        }
        .sell-calc-btn-container {
          grid-column: 1;
          grid-row: 2;
          display: flex;
          justify-content: flex-start;
        }
        @media (min-width: 1025px) {
          .sell-calc-btn {
            padding: 5px 24px !important;
          }
        }
        @media (max-width: 1024px) {
          .sell-calculator-container {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }
          .sell-calc-left {
            grid-column: 1 !important;
            grid-row: 1 !important;
          }
          .sell-calc-right {
            grid-column: 1 !important;
            grid-row: 2 !important;
          }
          .sell-calc-btn-container {
            grid-column: 1 !important;
            grid-row: 3 !important;
            justify-content: center !important;
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
          .sell-stats-grid > div:nth-child(odd) {
            border-left: none !important;
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
