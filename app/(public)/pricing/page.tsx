export const dynamic = 'force-dynamic'

export default function PricingPage() {
  return (
    <div style={{ background: '#0A0A0F', minHeight: '100vh' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 24px' }}>
        <h1 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 48, color: '#F0F0F8', marginBottom: 8 }}>
          PRICING
        </h1>
        <p style={{ fontSize: 11, color: '#8888AA', marginBottom: 40 }}>Last updated: March 2026</p>

        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 28, color: '#E63950', marginTop: 40, marginBottom: 16 }}>Simple, Transparent Pricing</h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#8888AA', lineHeight: 1.8, marginBottom: 16 }}>
          Hexlura charges a single booking fee per ticket. There are no hidden costs, no monthly fees, and no setup charges.
        </p>

        <div style={{ borderTop: '1px solid #2A2A3A', margin: '40px 0' }} />

        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 28, color: '#E63950', marginTop: 40, marginBottom: 16 }}>For Ticket Buyers</h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#8888AA', lineHeight: 1.8, marginBottom: 16 }}>
          <strong style={{ color: '#F0F0F8' }}>Booking Fee</strong>: 5% of ticket face value + £0.49<br />
          <strong style={{ color: '#F0F0F8' }}>Minimum fee</strong>: £0.99 per ticket<br />
          <strong style={{ color: '#F0F0F8' }}>Maximum fee</strong>: £5.00 per ticket
        </p>

        <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, color: '#F0F0F8', fontWeight: 600, marginTop: 24 }}>Examples</h3>
        <ul style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#8888AA', lineHeight: 1.8, marginBottom: 16, paddingLeft: 24 }}>
          <li style={{ marginBottom: 8 }}>£5.00 ticket → <strong style={{ color: '#F0F0F8' }}>£0.99</strong> booking fee (minimum applies)</li>
          <li style={{ marginBottom: 8 }}>£10.00 ticket → <strong style={{ color: '#F0F0F8' }}>£0.99</strong> booking fee (minimum applies)</li>
          <li style={{ marginBottom: 8 }}>£20.00 ticket → <strong style={{ color: '#F0F0F8' }}>£1.49</strong> booking fee</li>
          <li style={{ marginBottom: 8 }}>£50.00 ticket → <strong style={{ color: '#F0F0F8' }}>£3.00</strong> booking fee</li>
          <li style={{ marginBottom: 8 }}>£100.00 ticket → <strong style={{ color: '#F0F0F8' }}>£5.00</strong> booking fee (maximum applies)</li>
        </ul>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#8888AA', lineHeight: 1.8, marginBottom: 16 }}>
          The booking fee is shown clearly before you complete your purchase.
        </p>

        <div style={{ borderTop: '1px solid #2A2A3A', margin: '40px 0' }} />

        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 28, color: '#E63950', marginTop: 40, marginBottom: 16 }}>For Event Organisers</h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#8888AA', lineHeight: 1.8, marginBottom: 16 }}>
          <strong style={{ color: '#F0F0F8' }}>Free to use</strong>: No setup fees, no monthly subscription, no listing fees.<br />
          <strong style={{ color: '#F0F0F8' }}>You keep 100%</strong>: Of the ticket face value — always.<br />
          <strong style={{ color: '#F0F0F8' }}>Payouts</strong>: Processed 2 business days after your event via Stripe Connect.<br />
          <strong style={{ color: '#F0F0F8' }}>Stripe Connect</strong>: Required to receive payouts. Free to set up.
        </p>

        <div style={{ borderTop: '1px solid #2A2A3A', margin: '40px 0' }} />

        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 28, color: '#E63950', marginTop: 40, marginBottom: 16 }}>Free Events</h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#8888AA', lineHeight: 1.8, marginBottom: 16 }}>
          Free events can be listed and managed on Hexlura at no cost. No booking fee applies to free tickets.
        </p>

        <div style={{ borderTop: '1px solid #2A2A3A', margin: '40px 0' }} />

        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 28, color: '#E63950', marginTop: 40, marginBottom: 16 }}>Contact</h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#8888AA', lineHeight: 1.8, marginBottom: 16 }}>
          Questions about pricing? Email <a href="mailto:support@hexlura.com" style={{ color: '#E63950' }}>support@hexlura.com</a>
        </p>
      </div>
    </div>
  )
}
