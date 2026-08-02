import Link from 'next/link'

type FinalCTASectionProps = {
  ctaHref: string
}

export default function FinalCTASection({ ctaHref }: FinalCTASectionProps) {
  return (
    <section
      style={{
        background: 'var(--text)',
        color: '#FFFFFF',
        textAlign: 'center',
        padding: '96px 0',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: '0 32px',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 12,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            marginBottom: 16,
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 8 }}>●</span>
          Join Hexlura
        </p>

        <h2
          style={{
            fontFamily: 'var(--font-heading), sans-serif',
            fontSize: 'clamp(34px, 5.5vw, 58px)',
            marginBottom: 16,
            lineHeight: 1.02,
            color: '#FFFFFF',
            textTransform: 'uppercase',
          }}
        >
          Create your event.<br />
          <span style={{ color: 'var(--accent)' }}>Keep everything.</span>
        </h2>

        <p
          style={{
            color: '#C0C0C8',
            fontSize: 16,
            marginBottom: 32,
            maxWidth: 480,
            margin: '0 auto 32px',
          }}
        >
          No setup fees. No monthly fees. No contracts. Just your event, and your money.
        </p>

        <div
          style={{
            display: 'flex',
            gap: 14,
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginBottom: 16,
          }}
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
              e.currentTarget.style.boxShadow = '4px 4px 0 #FFFFFF'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translate(0,0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            Create your free account
          </Link>

          <Link
            href="/auth/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 22px',
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 2,
              border: '2px solid #FFFFFF',
              background: 'transparent',
              color: '#FFFFFF',
              textDecoration: 'none',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translate(-2px,-2px)'
              e.currentTarget.style.boxShadow = `4px 4px 0 var(--gold)`
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translate(0,0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            Sign in
          </Link>
        </div>
      </div>

      <style>{`
        @media (prefers-reduced-motion: reduce) {
          section a { transition: none !important; }
        }
      `}</style>
    </section>
  )
}
