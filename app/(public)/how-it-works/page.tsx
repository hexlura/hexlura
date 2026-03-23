export const dynamic = 'force-dynamic'

export default function HowItWorksPage() {
  return (
    <div style={{ background: '#0A0A0F', minHeight: '100vh' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 24px' }}>
        <h1 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 48, color: '#F0F0F8', marginBottom: 8 }}>
          HOW IT WORKS
        </h1>
        <p style={{ fontSize: 11, color: '#8888AA', marginBottom: 40 }}>Last updated: March 2026</p>

        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 28, color: '#E63950', marginTop: 40, marginBottom: 16 }}>For Ticket Buyers</h2>

        <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, color: '#F0F0F8', fontWeight: 600, marginTop: 24 }}>1. Find an event</h3>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#8888AA', lineHeight: 1.8, marginBottom: 16 }}>
          Browse events by city or category. Use the Find Events page to discover what&apos;s on near you.
        </p>

        <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, color: '#F0F0F8', fontWeight: 600, marginTop: 24 }}>2. Select your tickets</h3>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#8888AA', lineHeight: 1.8, marginBottom: 16 }}>
          Choose your ticket type and quantity. See the full price breakdown including booking fee before you pay.
        </p>

        <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, color: '#F0F0F8', fontWeight: 600, marginTop: 24 }}>3. Pay securely</h3>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#8888AA', lineHeight: 1.8, marginBottom: 16 }}>
          Pay by card through our secure Stripe-powered checkout. Your payment is protected.
        </p>

        <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, color: '#F0F0F8', fontWeight: 600, marginTop: 24 }}>4. Get your tickets</h3>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#8888AA', lineHeight: 1.8, marginBottom: 16 }}>
          Receive a confirmation email with your PDF ticket containing your unique QR code. Download and save it to your phone.
        </p>

        <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, color: '#F0F0F8', fontWeight: 600, marginTop: 24 }}>5. Show up and enjoy</h3>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#8888AA', lineHeight: 1.8, marginBottom: 16 }}>
          Show your QR code at the door. Each QR code is valid for one scan only.
        </p>

        <div style={{ borderTop: '1px solid #2A2A3A', margin: '40px 0' }} />

        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 28, color: '#E63950', marginTop: 40, marginBottom: 16 }}>For Event Organisers</h2>

        <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, color: '#F0F0F8', fontWeight: 600, marginTop: 24 }}>1. Create an account</h3>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#8888AA', lineHeight: 1.8, marginBottom: 16 }}>
          Register and select &quot;I want to sell tickets&quot; to set up your organiser profile.
        </p>

        <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, color: '#F0F0F8', fontWeight: 600, marginTop: 24 }}>2. Connect Stripe</h3>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#8888AA', lineHeight: 1.8, marginBottom: 16 }}>
          Connect your Stripe account to receive payouts directly to your bank account.
        </p>

        <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, color: '#F0F0F8', fontWeight: 600, marginTop: 24 }}>3. Create your event</h3>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#8888AA', lineHeight: 1.8, marginBottom: 16 }}>
          Add your event details, upload a banner, set ticket types and prices.
        </p>

        <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, color: '#F0F0F8', fontWeight: 600, marginTop: 24 }}>4. Share and sell</h3>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#8888AA', lineHeight: 1.8, marginBottom: 16 }}>
          Your event goes live instantly. Share your event link and start selling tickets.
        </p>

        <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, color: '#F0F0F8', fontWeight: 600, marginTop: 24 }}>5. Manage attendees</h3>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#8888AA', lineHeight: 1.8, marginBottom: 16 }}>
          Use your organiser dashboard to track sales, manage attendees, and check in guests on the door using our QR scanner.
        </p>

        <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, color: '#F0F0F8', fontWeight: 600, marginTop: 24 }}>6. Get paid</h3>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#8888AA', lineHeight: 1.8, marginBottom: 16 }}>
          Receive your payout 2 business days after your event ends.
        </p>
      </div>
    </div>
  )
}
