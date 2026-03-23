export const dynamic = 'force-dynamic'

export default function AboutPage() {
  return (
    <div style={{ background: '#0A0A0F', minHeight: '100vh' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 24px' }}>
        <h1 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 48, color: '#F0F0F8', marginBottom: 8 }}>
          ABOUT HEXLURA
        </h1>
        <p style={{ fontSize: 11, color: '#8888AA', marginBottom: 40 }}>Last updated: March 2026</p>

        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 28, color: '#E63950', marginTop: 40, marginBottom: 16 }}>Our Story</h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#8888AA', lineHeight: 1.8, marginBottom: 16 }}>
          Hexlura was built for the UK events scene. We believe discovering and attending live events should be simple, transparent, and exciting — whether it&apos;s a local club night, a live gig, a comedy show, or a major festival.
        </p>

        <div style={{ borderTop: '1px solid #2A2A3A', margin: '40px 0' }} />

        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 28, color: '#E63950', marginTop: 40, marginBottom: 16 }}>Our Mission</h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#8888AA', lineHeight: 1.8, marginBottom: 16 }}>
          We connect event organisers with their audiences across the UK. Our platform gives organisers the tools to sell tickets professionally, while giving buyers a seamless booking experience with clear, honest pricing.
        </p>

        <div style={{ borderTop: '1px solid #2A2A3A', margin: '40px 0' }} />

        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 28, color: '#E63950', marginTop: 40, marginBottom: 16 }}>For Organisers</h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#8888AA', lineHeight: 1.8, marginBottom: 16 }}>
          Hexlura is built with organisers in mind. We charge a simple, transparent booking fee — organisers keep 100% of the ticket face value. No hidden charges, no complex fee structures.
        </p>

        <div style={{ borderTop: '1px solid #2A2A3A', margin: '40px 0' }} />

        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 28, color: '#E63950', marginTop: 40, marginBottom: 16 }}>For Buyers</h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#8888AA', lineHeight: 1.8, marginBottom: 16 }}>
          Every ticket purchase on Hexlura comes with a clear breakdown of costs before you pay. Our booking fee is simple: 5% + 49p per ticket, with a minimum of £0.99 and maximum of £5.00.
        </p>

        <div style={{ borderTop: '1px solid #2A2A3A', margin: '40px 0' }} />

        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 28, color: '#E63950', marginTop: 40, marginBottom: 16 }}>The Company</h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#8888AA', lineHeight: 1.8, marginBottom: 16 }}>
          Hexlura is operated by Hexlura Ltd, a company registered in England and Wales.<br />
          <strong style={{ color: '#F0F0F8' }}>Company Number</strong>: 17102803<br />
          <strong style={{ color: '#F0F0F8' }}>Registered Address</strong>: 41 Junction Road, Northampton, England, NN2 7JA<br />
          <strong style={{ color: '#F0F0F8' }}>Contact</strong>: <a href="mailto:support@hexlura.com" style={{ color: '#E63950' }}>support@hexlura.com</a>
        </p>
      </div>
    </div>
  )
}
