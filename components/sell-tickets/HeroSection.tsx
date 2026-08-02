import Link from 'next/link'

// Barcode strip decoration — matches reference .barcode
function BarcodeStrip() {
  return (
    <div
      aria-hidden="true"
      style={{
        height: 34,
        background: `repeating-linear-gradient(
          90deg,
          var(--text) 0px,  var(--text) 2px,
          transparent 2px, transparent 4px,
          var(--text) 4px,  var(--text) 5px,
          transparent 5px, transparent 9px,
          var(--text) 9px,  var(--text) 12px,
          transparent 12px, transparent 15px
        )`,
        opacity: 0.85,
      }}
    />
  )
}

type HeroSectionProps = {
  ctaHref: string
}

export default function HeroSection({ ctaHref }: HeroSectionProps) {
  return (
    <section
      id="hero"
      style={{
        padding: '88px 0 60px',
        position: 'relative',
        backgroundColor: 'var(--surface)',
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: '0 32px',
        }}
        className="st-hero-grid"
      >
        {/* Left: Copy */}
        <div>
          <p
            style={{
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 12,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 18,
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 8 }}>●</span>
            For event organisers
          </p>

          <h1
            style={{
              fontFamily: 'var(--font-heading), sans-serif',
              fontSize: 'clamp(44px, 6vw, 85px)',
              fontWeight: 700,
              letterSpacing: '0.03em',
              lineHeight: 0.90,
              marginBottom: 24,
              color: 'var(--text)',
              textTransform: 'uppercase',
            }}
          >
            Sell tickets.<br />
            Keep the{' '}
            <span style={{ color: 'var(--accent)' }}>face value.</span>
          </h1>

          <p
            style={{
              fontSize: 18,
              lineHeight: 1.55,
              color: 'var(--muted)',
              maxWidth: 480,
              marginBottom: 32,
            }}
          >
            Zero monthly fees, zero commission, zero fine print. Every pound
            your fans pay for a ticket lands in your account — we just help you
            sell it.
          </p>

          <div
            style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}
          >
            <Link
              href={ctaHref}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 22px',
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 2,
                border: '2px solid var(--accent)',
                background: 'var(--accent)',
                color: '#FFFFFF',
                textDecoration: 'none',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translate(-2px,-2px)'
                e.currentTarget.style.boxShadow = '4px 4px 0 var(--text)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translate(0,0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              Start selling — free
            </Link>

            <a
              href="#compare"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 22px',
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 2,
                border: '2px solid var(--text)',
                background: 'transparent',
                color: 'var(--text)',
                textDecoration: 'none',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translate(-2px,-2px)'
                e.currentTarget.style.boxShadow = '4px 4px 0 var(--accent)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translate(0,0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              See the real numbers
            </a>
          </div>

          <p
            style={{
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 12.5,
              color: 'var(--muted)',
            }}
          >
            NO SETUP FEE · NO MONTHLY FEE · APPROVED IN MINUTES
          </p>
        </div>

        {/* Right: Ticket stub */}
        <div
          style={{
            background: 'var(--card)',
            border: '2px solid var(--text)',
            borderRadius: 6,
            position: 'relative',
            boxShadow: '8px 8px 0 var(--accent)',
            transform: 'rotate(1.2deg)',
          }}
        >
          {/* Top */}
          <div
            style={{
              padding: '26px 28px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-mono), monospace',
                  fontSize: 11,
                  letterSpacing: '0.12em',
                  color: 'var(--muted)',
                  marginBottom: 6,
                }}
              >
                ADMIT ONE · ORGANISER COPY
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-heading), sans-serif',
                  fontSize: 22,
                  marginBottom: 4,
                  color: 'var(--text)',
                  textTransform: 'uppercase',
                }}
              >
                SUMMER FEST &apos;26
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono), monospace',
                  fontSize: 12.5,
                  color: 'var(--muted)',
                }}
              >
                SERIAL HXL-004471 · QTY 1000 · £20.00
              </div>
            </div>

            {/* Stamp */}
            <div
              aria-label="100% yours"
              style={{
                width: 78,
                height: 78,
                borderRadius: '50%',
                border: '2.5px dashed var(--gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                transform: 'rotate(-11deg)',
                color: 'var(--gold)',
                flexShrink: 0,
              }}
            >
              <b
                style={{
                  fontFamily: 'var(--font-heading), sans-serif',
                  fontSize: 20,
                  lineHeight: 1,
                }}
              >
                100%
              </b>
              <span
                style={{
                  fontSize: 8,
                  letterSpacing: '0.08em',
                  fontFamily: 'var(--font-mono), monospace',
                }}
              >
                YOURS
              </span>
            </div>
          </div>

          {/* Perforation (notch tear) */}
          <div style={{ position: 'relative', height: 0 }}>
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                width: 20,
                height: 20,
                background: 'var(--surface)',
                borderRadius: '50%',
                top: -10,
                left: -10,
              }}
            />
            <div style={{ borderTop: '2px dashed var(--border)', margin: '0 20px' }} />
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                width: 20,
                height: 20,
                background: 'var(--surface)',
                borderRadius: '50%',
                top: -10,
                right: -10,
              }}
            />
          </div>

          {/* Bottom */}
          <div style={{ padding: '22px 28px 26px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 10,
                fontSize: 14,
              }}
            >
              <span style={{ color: 'var(--muted)' }}>On a typical platform</span>
              <span
                style={{
                  textDecoration: 'line-through',
                  color: 'var(--muted)',
                  fontFamily: 'var(--font-mono), monospace',
                }}
              >
                £20,000
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 10,
                fontSize: 14,
              }}
            >
              <span style={{ color: 'var(--muted)' }}>On Hexlura</span>
              <span
                style={{
                  fontFamily: 'var(--font-mono), monospace',
                  fontWeight: 600,
                  color: 'var(--accent)',
                }}
              >
                full face value
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                paddingTop: 14,
                marginTop: 8,
                borderTop: '2px solid var(--text)',
              }}
            >
              <span style={{ color: 'var(--text)' }}>Total revenue</span>
              <span
                style={{
                  fontFamily: 'var(--font-heading), sans-serif',
                  fontSize: 34,
                  color: 'var(--text)',
                }}
              >
                £20,000
              </span>
            </div>
          </div>

          <BarcodeStrip />
        </div>
      </div>

      <style>{`
        .st-hero-grid {
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          gap: 56px;
          align-items: center;
        }
        @media (max-width: 900px) {
          .st-hero-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .st-hero-grid a, .st-hero-grid button {
            transition: none !important;
          }
        }
      `}</style>
    </section>
  )
}
