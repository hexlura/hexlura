export const dynamic = 'force-dynamic'

export default function HelpPage() {
  return (
    <div style={{ background: '#0A0A0F', minHeight: '100vh' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 24px' }}>
        <h1 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 48, color: '#F0F0F8', marginBottom: 8 }}>
          HELP &amp; SUPPORT
        </h1>
        <p style={{ fontSize: 11, color: '#8888AA', marginBottom: 40 }}>Last updated: March 2026</p>

        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 28, color: '#E63950', marginTop: 40, marginBottom: 16 }}>Contact Us</h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#8888AA', lineHeight: 1.8, marginBottom: 16 }}>
          For any questions or issues, email us at <a href="mailto:support@hexlura.com" style={{ color: '#E63950' }}>support@hexlura.com</a>. We aim to respond within 24 hours.
        </p>

        <div style={{ borderTop: '1px solid #2A2A3A', margin: '40px 0' }} />

        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 28, color: '#E63950', marginTop: 40, marginBottom: 16 }}>Frequently Asked Questions</h2>

        <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, color: '#F0F0F8', fontWeight: 600, marginTop: 24 }}>Buying Tickets</h3>

        <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, color: '#F0F0F8', fontWeight: 600, marginTop: 24 }}>I haven&apos;t received my ticket email — what should I do?</h3>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#8888AA', lineHeight: 1.8, marginBottom: 16 }}>
          Check your spam/junk folder first. If it&apos;s not there, log in to your Hexlura account and download your ticket from the My Bookings section. If you still have issues, contact <a href="mailto:support@hexlura.com" style={{ color: '#E63950' }}>support@hexlura.com</a> with your booking reference.
        </p>

        <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, color: '#F0F0F8', fontWeight: 600, marginTop: 24 }}>Can I get a refund?</h3>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#8888AA', lineHeight: 1.8, marginBottom: 16 }}>
          Tickets are non-refundable unless the event is cancelled or significantly changed by the organiser. If an event is cancelled, you will receive a full refund of the ticket face value within 5-10 business days.
        </p>

        <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, color: '#F0F0F8', fontWeight: 600, marginTop: 24 }}>My QR code isn&apos;t scanning — what do I do?</h3>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#8888AA', lineHeight: 1.8, marginBottom: 16 }}>
          Ensure your screen brightness is turned up fully. If the issue persists, show your booking reference to the door staff who can verify your booking manually.
        </p>

        <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, color: '#F0F0F8', fontWeight: 600, marginTop: 24 }}>Can I transfer my ticket to someone else?</h3>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#8888AA', lineHeight: 1.8, marginBottom: 16 }}>
          Currently tickets are non-transferable. Please ensure you purchase tickets for the correct people.
        </p>

        <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, color: '#F0F0F8', fontWeight: 600, marginTop: 24 }}>Is my payment secure?</h3>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#8888AA', lineHeight: 1.8, marginBottom: 16 }}>
          Yes. All payments are processed by Stripe, one of the world&apos;s leading payment processors. We never store your card details.
        </p>

        <div style={{ borderTop: '1px solid #2A2A3A', margin: '40px 0' }} />

        <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, color: '#F0F0F8', fontWeight: 600, marginTop: 24 }}>Organiser Questions</h3>

        <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, color: '#F0F0F8', fontWeight: 600, marginTop: 24 }}>How do I start selling tickets?</h3>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#8888AA', lineHeight: 1.8, marginBottom: 16 }}>
          Register for a Hexlura account, select organiser during signup, connect your Stripe account, and create your first event.
        </p>

        <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, color: '#F0F0F8', fontWeight: 600, marginTop: 24 }}>When do I receive my payout?</h3>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#8888AA', lineHeight: 1.8, marginBottom: 16 }}>
          Payouts are processed 2 business days after your event ends, directly to your connected bank account via Stripe.
        </p>

        <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, color: '#F0F0F8', fontWeight: 600, marginTop: 24 }}>What happens if I need to cancel my event?</h3>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#8888AA', lineHeight: 1.8, marginBottom: 16 }}>
          Contact <a href="mailto:support@hexlura.com" style={{ color: '#E63950' }}>support@hexlura.com</a> as soon as possible. We will process refunds to all ticket buyers and notify them by email.
        </p>

        <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, color: '#F0F0F8', fontWeight: 600, marginTop: 24 }}>Is there a limit on how many tickets I can sell?</h3>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#8888AA', lineHeight: 1.8, marginBottom: 16 }}>
          No. You set the capacity when creating your event.
        </p>
      </div>
    </div>
  )
}
