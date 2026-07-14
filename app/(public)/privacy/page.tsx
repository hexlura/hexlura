import { getStaticPageMetadata } from '@/lib/seo'
import type { Metadata } from 'next'
import { getLatestLegalDocument } from '@/lib/legal'
import { PublishedLegalDocument } from '@/components/legal/PublishedLegalDocument'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
    return getStaticPageMetadata('/privacy')
}

export default async function PrivacyPage() {
  const doc = await getLatestLegalDocument('privacy')
  if (doc) return <PublishedLegalDocument doc={doc} title="Privacy Policy" />
  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 24px' }}>
        <h1 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 48, color: '#0A0A0F', marginBottom: 8 }}>
          PRIVACY POLICY
        </h1>
        <p style={{ fontSize: 11, color: '#444455', marginBottom: 40 }}>Last updated: March 2026</p>

        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 28, color: '#E63950', marginTop: 40, marginBottom: 16 }}>Who We Are</h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#444455', lineHeight: 1.8, marginBottom: 16 }}>
          Hexlura is operated by <strong style={{ color: '#0A0A0F' }}>Hexlura Ltd (Company No. 17102803)</strong>, registered at 41 Junction Road, Northampton, England, NN2 7JA. We are registered with the Information Commissioner&apos;s Office (ICO). ICO Registration Number: [PENDING].
        </p>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#444455', lineHeight: 1.8, marginBottom: 16 }}>
          Contact: <a href="mailto:support@hexlura.com" style={{ color: '#E63950' }}>support@hexlura.com</a>
        </p>

        <div style={{ borderTop: '1px solid #C0C0C8', margin: '40px 0' }} />

        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 28, color: '#E63950', marginTop: 40, marginBottom: 16 }}>What Data We Collect</h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#444455', lineHeight: 1.8, marginBottom: 16 }}>
          We collect the following personal data:
        </p>
        <ul style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#444455', lineHeight: 1.8, marginBottom: 16, paddingLeft: 24 }}>
          <li style={{ marginBottom: 8 }}><strong style={{ color: '#0A0A0F' }}>Account data</strong>: name, email address, password (encrypted)</li>
          <li style={{ marginBottom: 8 }}><strong style={{ color: '#0A0A0F' }}>Booking data</strong>: ticket purchases, booking references, payment amounts</li>
          <li style={{ marginBottom: 8 }}><strong style={{ color: '#0A0A0F' }}>Payment data</strong>: processed securely by Stripe — we never store card details</li>
          <li style={{ marginBottom: 8 }}><strong style={{ color: '#0A0A0F' }}>Profile data</strong>: optional profile photo, organiser business details</li>
          <li style={{ marginBottom: 8 }}><strong style={{ color: '#0A0A0F' }}>Technical data</strong>: IP address, browser type, device information, cookies</li>
          <li style={{ marginBottom: 8 }}><strong style={{ color: '#0A0A0F' }}>Communications</strong>: emails you send to our support team</li>
        </ul>

        <div style={{ borderTop: '1px solid #C0C0C8', margin: '40px 0' }} />

        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 28, color: '#E63950', marginTop: 40, marginBottom: 16 }}>Why We Collect It (Legal Basis)</h2>
        <ul style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#444455', lineHeight: 1.8, marginBottom: 16, paddingLeft: 24 }}>
          <li style={{ marginBottom: 8 }}><strong style={{ color: '#0A0A0F' }}>Contract performance</strong>: to process bookings and deliver tickets</li>
          <li style={{ marginBottom: 8 }}><strong style={{ color: '#0A0A0F' }}>Legal obligation</strong>: fraud prevention, financial record keeping</li>
          <li style={{ marginBottom: 8 }}><strong style={{ color: '#0A0A0F' }}>Legitimate interests</strong>: platform security, preventing abuse</li>
          <li style={{ marginBottom: 8 }}><strong style={{ color: '#0A0A0F' }}>Consent</strong>: marketing emails (you can unsubscribe at any time)</li>
        </ul>

        <div style={{ borderTop: '1px solid #C0C0C8', margin: '40px 0' }} />

        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 28, color: '#E63950', marginTop: 40, marginBottom: 16 }}>How We Use Your Data</h2>
        <ul style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#444455', lineHeight: 1.8, marginBottom: 16, paddingLeft: 24 }}>
          <li style={{ marginBottom: 8 }}>Process ticket bookings and send confirmation emails</li>
          <li style={{ marginBottom: 8 }}>Generate PDF tickets and QR codes</li>
          <li style={{ marginBottom: 8 }}>Process payments via Stripe</li>
          <li style={{ marginBottom: 8 }}>Send transactional emails via Resend</li>
          <li style={{ marginBottom: 8 }}>Communicate important account or booking updates</li>
          <li style={{ marginBottom: 8 }}>Prevent fraud and ensure platform security</li>
          <li style={{ marginBottom: 8 }}>Comply with legal obligations</li>
        </ul>

        <div style={{ borderTop: '1px solid #C0C0C8', margin: '40px 0' }} />

        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 28, color: '#E63950', marginTop: 40, marginBottom: 16 }}>Who We Share Data With</h2>
        <ul style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#444455', lineHeight: 1.8, marginBottom: 16, paddingLeft: 24 }}>
          <li style={{ marginBottom: 8 }}><strong style={{ color: '#0A0A0F' }}>Stripe</strong>: payment processing (their privacy policy applies)</li>
          <li style={{ marginBottom: 8 }}><strong style={{ color: '#0A0A0F' }}>Supabase</strong>: secure database hosting (EU/US data processing agreement in place)</li>
          <li style={{ marginBottom: 8 }}><strong style={{ color: '#0A0A0F' }}>Resend</strong>: transactional email delivery</li>
          <li style={{ marginBottom: 8 }}><strong style={{ color: '#0A0A0F' }}>Vercel</strong>: website hosting</li>
        </ul>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#444455', lineHeight: 1.8, marginBottom: 16 }}>
          We do not sell your personal data to third parties.
        </p>

        <div style={{ borderTop: '1px solid #C0C0C8', margin: '40px 0' }} />

        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 28, color: '#E63950', marginTop: 40, marginBottom: 16 }}>Data Retention</h2>
        <ul style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#444455', lineHeight: 1.8, marginBottom: 16, paddingLeft: 24 }}>
          <li style={{ marginBottom: 8 }}>Account data: retained while your account is active + 7 years after closure</li>
          <li style={{ marginBottom: 8 }}>Booking data: 7 years (legal/tax requirement)</li>
          <li style={{ marginBottom: 8 }}>Marketing consent: until you withdraw consent</li>
        </ul>

        <div style={{ borderTop: '1px solid #C0C0C8', margin: '40px 0' }} />

        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 28, color: '#E63950', marginTop: 40, marginBottom: 16 }}>Your Rights (UK GDPR)</h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#444455', lineHeight: 1.8, marginBottom: 16 }}>
          You have the right to:
        </p>
        <ul style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#444455', lineHeight: 1.8, marginBottom: 16, paddingLeft: 24 }}>
          <li style={{ marginBottom: 8 }}><strong style={{ color: '#0A0A0F' }}>Access</strong> your personal data</li>
          <li style={{ marginBottom: 8 }}><strong style={{ color: '#0A0A0F' }}>Rectify</strong> inaccurate data</li>
          <li style={{ marginBottom: 8 }}><strong style={{ color: '#0A0A0F' }}>Erase</strong> your data (&quot;right to be forgotten&quot;)</li>
          <li style={{ marginBottom: 8 }}><strong style={{ color: '#0A0A0F' }}>Restrict</strong> processing of your data</li>
          <li style={{ marginBottom: 8 }}><strong style={{ color: '#0A0A0F' }}>Data portability</strong> — receive your data in a machine-readable format</li>
          <li style={{ marginBottom: 8 }}><strong style={{ color: '#0A0A0F' }}>Object</strong> to processing based on legitimate interests</li>
          <li style={{ marginBottom: 8 }}><strong style={{ color: '#0A0A0F' }}>Withdraw consent</strong> at any time for consent-based processing</li>
        </ul>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#444455', lineHeight: 1.8, marginBottom: 16 }}>
          To exercise your rights, email <a href="mailto:support@hexlura.com" style={{ color: '#E63950' }}>support@hexlura.com</a>. We will respond within 30 days.
        </p>

        <div style={{ borderTop: '1px solid #C0C0C8', margin: '40px 0' }} />

        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 28, color: '#E63950', marginTop: 40, marginBottom: 16 }}>Cookies</h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#444455', lineHeight: 1.8, marginBottom: 16 }}>
          We use essential cookies only for authentication and payment processing. See our Cookie Policy for full details.
        </p>

        <div style={{ borderTop: '1px solid #C0C0C8', margin: '40px 0' }} />

        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 28, color: '#E63950', marginTop: 40, marginBottom: 16 }}>International Transfers</h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#444455', lineHeight: 1.8, marginBottom: 16 }}>
          Some of our service providers process data outside the UK. We ensure appropriate safeguards are in place including Standard Contractual Clauses where required.
        </p>

        <div style={{ borderTop: '1px solid #C0C0C8', margin: '40px 0' }} />

        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 28, color: '#E63950', marginTop: 40, marginBottom: 16 }}>Changes to This Policy</h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#444455', lineHeight: 1.8, marginBottom: 16 }}>
          We may update this policy periodically. We will notify you of significant changes by email or via a notice on our platform.
        </p>

        <div style={{ borderTop: '1px solid #C0C0C8', margin: '40px 0' }} />

        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 28, color: '#E63950', marginTop: 40, marginBottom: 16 }}>Contact &amp; Complaints</h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#444455', lineHeight: 1.8, marginBottom: 16 }}>
          Email: <a href="mailto:support@hexlura.com" style={{ color: '#E63950' }}>support@hexlura.com</a><br />
          Address: Hexlura Ltd, 41 Junction Road, Northampton, England, NN2 7JA
        </p>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#444455', lineHeight: 1.8, marginBottom: 16 }}>
          If you are unhappy with how we handle your data, you have the right to lodge a complaint with the ICO at{' '}
          <a href="https://ico.org.uk" style={{ color: '#E63950' }}>ico.org.uk</a>.
        </p>
      </div>
    </div>
  )
}
