import { getStaticPageMetadata } from '@/lib/seo'
import type { Metadata } from 'next'

export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
    return getStaticPageMetadata('/cookie-policy')
}

export default function CookiePolicyPage() {
  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 24px' }}>
        <h1 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 48, color: '#0A0A0F', marginBottom: 8 }}>
          COOKIE POLICY
        </h1>
        <p style={{ fontSize: 11, color: '#444455', marginBottom: 40 }}>Last updated: March 2026</p>

        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 28, color: '#E63950', marginTop: 40, marginBottom: 16 }}>What Are Cookies</h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#444455', lineHeight: 1.8, marginBottom: 16 }}>
          Cookies are small text files stored on your device when you visit a website. They help websites remember your preferences and work properly.
        </p>

        <div style={{ borderTop: '1px solid #C0C0C8', margin: '40px 0' }} />

        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 28, color: '#E63950', marginTop: 40, marginBottom: 16 }}>Cookies We Use</h2>

        <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, color: '#0A0A0F', fontWeight: 600, marginTop: 24 }}>Essential Cookies (Always Active)</h3>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#444455', lineHeight: 1.8, marginBottom: 16 }}>
          These cookies are required for the platform to function. You cannot opt out of these.
        </p>

        <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, color: '#0A0A0F', fontWeight: 600, marginTop: 24 }}>Authentication Cookies (Supabase Auth)</h3>
        <ul style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#444455', lineHeight: 1.8, marginBottom: 16, paddingLeft: 24 }}>
          <li style={{ marginBottom: 8 }}><strong style={{ color: '#0A0A0F' }}>Purpose</strong>: Keep you logged in during your session</li>
          <li style={{ marginBottom: 8 }}><strong style={{ color: '#0A0A0F' }}>Duration</strong>: Session / 7 days if &quot;remember me&quot; selected</li>
          <li style={{ marginBottom: 8 }}><strong style={{ color: '#0A0A0F' }}>Provider</strong>: Supabase</li>
        </ul>

        <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, color: '#0A0A0F', fontWeight: 600, marginTop: 24 }}>Payment Cookies (Stripe)</h3>
        <ul style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#444455', lineHeight: 1.8, marginBottom: 16, paddingLeft: 24 }}>
          <li style={{ marginBottom: 8 }}><strong style={{ color: '#0A0A0F' }}>Purpose</strong>: Secure payment processing and fraud prevention</li>
          <li style={{ marginBottom: 8 }}><strong style={{ color: '#0A0A0F' }}>Duration</strong>: Session</li>
          <li style={{ marginBottom: 8 }}><strong style={{ color: '#0A0A0F' }}>Provider</strong>: Stripe (<a href="https://stripe.com/privacy" style={{ color: '#E63950' }}>stripe.com/privacy</a>)</li>
        </ul>

        <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, color: '#0A0A0F', fontWeight: 600, marginTop: 24 }}>Analytics Cookies (Coming Soon)</h3>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#444455', lineHeight: 1.8, marginBottom: 16 }}>
          We plan to introduce analytics cookies in the future to help us improve the platform. We will update this policy and request your consent before doing so.
        </p>

        <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, color: '#0A0A0F', fontWeight: 600, marginTop: 24 }}>Marketing Cookies</h3>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#444455', lineHeight: 1.8, marginBottom: 16 }}>
          We do not currently use any marketing or advertising cookies.
        </p>

        <div style={{ borderTop: '1px solid #C0C0C8', margin: '40px 0' }} />

        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 28, color: '#E63950', marginTop: 40, marginBottom: 16 }}>Managing Cookies</h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#444455', lineHeight: 1.8, marginBottom: 16 }}>
          You can control cookies through your browser settings. Please note that disabling essential cookies will affect the functionality of the platform — you may not be able to log in or complete purchases.
        </p>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#444455', lineHeight: 1.8, marginBottom: 16 }}>
          Most browsers allow you to:
        </p>
        <ul style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#444455', lineHeight: 1.8, marginBottom: 16, paddingLeft: 24 }}>
          <li style={{ marginBottom: 8 }}>View cookies stored on your device</li>
          <li style={{ marginBottom: 8 }}>Delete cookies at any time</li>
          <li style={{ marginBottom: 8 }}>Block cookies from specific websites</li>
          <li style={{ marginBottom: 8 }}>Block all third-party cookies</li>
        </ul>

        <div style={{ borderTop: '1px solid #C0C0C8', margin: '40px 0' }} />

        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 28, color: '#E63950', marginTop: 40, marginBottom: 16 }}>Third Party Cookies</h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#444455', lineHeight: 1.8, marginBottom: 16 }}>
          Stripe may set cookies for payment processing purposes. Please refer to Stripe&apos;s privacy policy at <a href="https://stripe.com/privacy" style={{ color: '#E63950' }}>stripe.com/privacy</a> for more information.
        </p>

        <div style={{ borderTop: '1px solid #C0C0C8', margin: '40px 0' }} />

        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 28, color: '#E63950', marginTop: 40, marginBottom: 16 }}>Changes</h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#444455', lineHeight: 1.8, marginBottom: 16 }}>
          We will update this policy if we introduce new cookies. We will notify you of any significant changes.
        </p>

        <div style={{ borderTop: '1px solid #C0C0C8', margin: '40px 0' }} />

        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 28, color: '#E63950', marginTop: 40, marginBottom: 16 }}>Contact</h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#444455', lineHeight: 1.8, marginBottom: 16 }}>
          <a href="mailto:support@hexlura.com" style={{ color: '#E63950' }}>support@hexlura.com</a>
        </p>
      </div>
    </div>
  )
}
