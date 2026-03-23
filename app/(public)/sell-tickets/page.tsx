'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'

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

export default function SellTicketsPage() {
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
      title: 'CONNECT STRIPE',
      desc: 'Link your Stripe account to receive direct payouts straight to your bank. Takes 2 minutes.',
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
      iconColor: '#00E5A0',
      title: 'Group Tickets',
      desc: 'Sell group packages with individual QR codes generated for each member of the group.',
    },
    {
      icon: <IconBank />,
      iconColor: '#00E5A0',
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
      quote: 'We switched from Eventbrite and saved hundreds in fees. The dark design matches our brand perfectly and our customers love it.',
      name: 'Raj P',
      role: 'Festival Organiser, Birmingham',
      initials: 'RP',
    },
  ]

  const comparisonRows = [
    { feature: 'Booking fee', hexlura: '5% + 49p', eventbrite: '6.99% + 99p', fatsoma: '5% + 49p', hexluraGood: true, eventbriteGood: false, fatsomaGood: true },
    { feature: 'Organiser keeps face value', hexlura: '✅ 100%', eventbrite: '✅ 100%', fatsoma: '✅ 100%', hexluraGood: true, eventbriteGood: true, fatsomaGood: true },
    { feature: 'Monthly fee', hexlura: '✅ Free', eventbrite: '❌ Paid plans', fatsoma: '✅ Free', hexluraGood: true, eventbriteGood: false, fatsomaGood: true },
    { feature: 'Instant approval', hexlura: '✅ Yes', eventbrite: '✅ Yes', fatsoma: '✅ Yes', hexluraGood: true, eventbriteGood: true, fatsomaGood: true },
    { feature: 'Payout speed', hexlura: '✅ 2 days', eventbrite: '❌ 5–7 days', fatsoma: '❌ Varies', hexluraGood: true, eventbriteGood: false, fatsomaGood: false },
    { feature: 'UK focused', hexlura: '✅ Yes', eventbrite: '❌ Global', fatsoma: '✅ Yes', hexluraGood: true, eventbriteGood: false, fatsomaGood: true },
    { feature: 'Dark premium design', hexlura: '✅ Yes', eventbrite: '❌ No', fatsoma: '❌ No', hexluraGood: true, eventbriteGood: false, fatsomaGood: false },
  ]

  return (
    <div style={{ background: '#0A0A0F', color: '#F0F0F8' }}>

      {/* ── SECTION 1: HERO ─────────────────────────────────────────────── */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(230,57,80,0.15), transparent)',
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
              color: '#F0F0F8',
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
            color: '#8888AA',
            maxWidth: 560,
            lineHeight: 1.6,
            margin: '24px auto',
          }}>
            The UK&apos;s most organiser-friendly ticketing platform. Zero monthly fees. You keep 100% of face value. Always.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 32 }}>
            <Link
              href="/auth/register?next=/organiser/apply"
              style={{
                background: '#E63950',
                color: '#fff',
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
                border: '1px solid #2A2A3A',
                color: '#F0F0F8',
                padding: '16px 32px',
                fontSize: 16,
                borderRadius: 2,
                textDecoration: 'none',
                fontFamily: 'DM Sans, sans-serif',
                display: 'inline-block',
                transition: 'border-color 0.2s',
              }}
              onMouseOver={e => (e.currentTarget.style.borderColor = '#F0F0F8')}
              onMouseOut={e => (e.currentTarget.style.borderColor = '#2A2A3A')}
            >
              See How It Works
            </a>
          </div>

          <p style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 13,
            color: '#8888AA',
            marginTop: 20,
          }}>
            No setup fees · No monthly subscription · Instant approval
          </p>
        </div>
      </section>

      {/* ── SECTION 2: STATS BAR ────────────────────────────────────────── */}
      <section style={{
        background: '#13131A',
        borderTop: '1px solid #2A2A3A',
        borderBottom: '1px solid #2A2A3A',
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
              borderLeft: i > 0 ? '1px solid #2A2A3A' : 'none',
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
                color: '#8888AA',
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 3: HOW IT WORKS ─────────────────────────────────────── */}
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
            color: '#F0F0F8',
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
                  background: '#13131A',
                  border: '1px solid #2A2A3A',
                  padding: 32,
                  position: 'relative',
                  transition: 'border-color 0.2s',
                  cursor: 'default',
                }}
                onMouseOver={e => (e.currentTarget.style.borderColor = '#E63950')}
                onMouseOut={e => (e.currentTarget.style.borderColor = '#2A2A3A')}
              >
                <div style={{
                  position: 'absolute',
                  top: 16,
                  right: 20,
                  fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif',
                  fontSize: 64,
                  color: '#2A2A3A',
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
                  color: '#F0F0F8',
                  margin: '0 0 12px',
                  letterSpacing: 0.5,
                }}>
                  {step.title}
                </h3>
                <p style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 14,
                  color: '#8888AA',
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

      {/* ── SECTION 4: PRICING COMPARISON ───────────────────────────────── */}
      <section style={{
        padding: '100px 24px',
        background: '#13131A',
        borderTop: '1px solid #2A2A3A',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 12,
            color: '#E63950',
            letterSpacing: 4,
            textTransform: 'uppercase',
            textAlign: 'center',
            marginBottom: 12,
          }}>
            Transparent Pricing
          </p>
          <h2 style={{
            fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif',
            fontSize: 56,
            color: '#F0F0F8',
            textAlign: 'center',
            margin: '0 0 64px',
            letterSpacing: 1,
          }}>
            SEE HOW WE COMPARE
          </h2>

          <div style={{
            background: '#1A1A24',
            border: '1px solid #2A2A3A',
            overflowX: 'auto',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#0A0A0F' }}>
                  <th style={{
                    fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif',
                    fontSize: 16,
                    color: '#8888AA',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    padding: '16px 24px',
                    textAlign: 'left',
                    borderBottom: '1px solid #2A2A3A',
                  }}>
                    Feature
                  </th>
                  <th style={{
                    fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif',
                    fontSize: 18,
                    color: '#E63950',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    padding: '16px 24px',
                    textAlign: 'center',
                    borderBottom: '1px solid #2A2A3A',
                    background: 'rgba(230,57,80,0.05)',
                    position: 'relative',
                  }}>
                    <span style={{
                      display: 'inline-block',
                      background: '#E63950',
                      color: '#fff',
                      fontSize: 10,
                      padding: '3px 10px',
                      letterSpacing: 1,
                      marginBottom: 6,
                      fontFamily: 'DM Sans, sans-serif',
                      fontWeight: 600,
                    }}>
                      BEST VALUE
                    </span>
                    <br />
                    Hexlura
                  </th>
                  <th style={{
                    fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif',
                    fontSize: 16,
                    color: '#8888AA',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    padding: '16px 24px',
                    textAlign: 'center',
                    borderBottom: '1px solid #2A2A3A',
                  }}>
                    Eventbrite
                  </th>
                  <th style={{
                    fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif',
                    fontSize: 16,
                    color: '#8888AA',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    padding: '16px 24px',
                    textAlign: 'center',
                    borderBottom: '1px solid #2A2A3A',
                  }}>
                    Fatsoma
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr key={row.feature} style={{ borderBottom: i < comparisonRows.length - 1 ? '1px solid #2A2A3A' : 'none' }}>
                    <td style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 14,
                      color: '#8888AA',
                      padding: '16px 24px',
                    }}>
                      {row.feature}
                    </td>
                    <td style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 14,
                      color: row.hexlura.startsWith('✅') ? '#00E5A0' : row.hexlura.startsWith('❌') ? '#E63950' : '#F0F0F8',
                      fontWeight: 600,
                      padding: '16px 24px',
                      textAlign: 'center',
                      background: 'rgba(230,57,80,0.05)',
                    }}>
                      {row.hexlura}
                    </td>
                    <td style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 14,
                      color: row.eventbrite.startsWith('✅') ? '#00E5A0' : row.eventbrite.startsWith('❌') ? '#E63950' : '#8888AA',
                      padding: '16px 24px',
                      textAlign: 'center',
                    }}>
                      {row.eventbrite}
                    </td>
                    <td style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 14,
                      color: row.fatsoma.startsWith('✅') ? '#00E5A0' : row.fatsoma.startsWith('❌') ? '#E63950' : '#8888AA',
                      padding: '16px 24px',
                      textAlign: 'center',
                    }}>
                      {row.fatsoma}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── SECTION 5: FEATURES ─────────────────────────────────────────── */}
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
            color: '#F0F0F8',
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
                  background: '#13131A',
                  border: '1px solid #2A2A3A',
                  padding: 32,
                  transition: 'border-color 0.2s',
                  cursor: 'default',
                }}
                onMouseOver={e => (e.currentTarget.style.borderColor = feature.iconColor)}
                onMouseOut={e => (e.currentTarget.style.borderColor = '#2A2A3A')}
              >
                <div style={{
                  width: 56,
                  height: 56,
                  background: '#1A1A24',
                  border: '1px solid #2A2A3A',
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
                  color: '#F0F0F8',
                  fontWeight: 600,
                  margin: '0 0 12px',
                }}>
                  {feature.title}
                </h3>
                <p style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 14,
                  color: '#8888AA',
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

      {/* ── SECTION 6: TESTIMONIALS ─────────────────────────────────────── */}
      <section style={{
        padding: '100px 24px',
        background: '#13131A',
        borderTop: '1px solid #2A2A3A',
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
            color: '#F0F0F8',
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
                  background: '#1A1A24',
                  border: '1px solid #2A2A3A',
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
                  color: '#F0F0F8',
                  lineHeight: 1.7,
                  fontStyle: 'italic',
                  marginBottom: 24,
                }}>
                  {t.quote}
                </p>
                <div style={{ borderTop: '1px solid #2A2A3A', marginBottom: 20 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: '#2A2A3A',
                    color: '#F0F0F8',
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
                      color: '#F0F0F8',
                      fontWeight: 600,
                    }}>
                      {t.name}
                    </div>
                    <div style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 13,
                      color: '#8888AA',
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

      {/* ── SECTION 7: FINAL CTA ────────────────────────────────────────── */}
      <section style={{
        padding: 'clamp(80px, 10vw, 120px) 24px',
        background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(230,57,80,0.12), transparent)',
        borderTop: '1px solid #2A2A3A',
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
          color: '#F0F0F8',
          margin: '0 0 0',
          letterSpacing: 1,
          lineHeight: 1,
        }}>
          READY TO START SELLING?
        </h2>
        <p style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 18,
          color: '#8888AA',
          maxWidth: 500,
          margin: '16px auto 40px',
          lineHeight: 1.6,
        }}>
          Join hundreds of UK organisers already selling on Hexlura. Free to start. No contracts. Cancel anytime.
        </p>
        <Link
          href="/auth/register?next=/organiser/apply"
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
              color: '#8888AA',
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
            border-top: 1px solid #2A2A3A;
          }
          .sell-stats-grid > div:nth-child(odd) {
            border-left: none !important;
          }
          .sell-stats-grid > div:nth-child(even) {
            border-left: 1px solid #2A2A3A !important;
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
