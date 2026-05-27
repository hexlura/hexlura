import { getStaticPageMetadata } from '@/lib/seo'
import type { Metadata } from 'next'

export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
    return getStaticPageMetadata('/contact')
}

export default function ContactPage() {
  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 24px' }}>
        <h1 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 48, color: '#0A0A0F', marginBottom: 8 }}>
          CONTACT US
        </h1>

        <div style={{ borderTop: '1px solid #C0C0C8', margin: '40px 0' }} />

        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 28, color: '#E63950', marginTop: 40, marginBottom: 16 }}>Get In Touch</h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#444455', lineHeight: 1.8, marginBottom: 16 }}>
          We would love to hear from you. Whether you have a question about a booking, need help with your organiser account, or just want to say hello — we are here to help.
        </p>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#444455', lineHeight: 1.8, marginBottom: 16 }}>
          <strong style={{ color: '#0A0A0F' }}>Email</strong>: <a href="mailto:support@hexlura.com" style={{ color: '#E63950' }}>support@hexlura.com</a><br />
          <strong style={{ color: '#0A0A0F' }}>Response time</strong>: Within 24 hours, Monday to Friday
        </p>

        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#444455', lineHeight: 1.8, marginBottom: 16 }}>
          <strong style={{ color: '#0A0A0F' }}>Registered Office</strong>:<br />
          Hexlura Ltd<br />
          41 Junction Road<br />
          Northampton<br />
          England<br />
          NN2 7JA<br />
          Company No. 17102803
        </p>

        <div style={{ borderTop: '1px solid #C0C0C8', margin: '40px 0' }} />

        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 28, color: '#E63950', marginTop: 40, marginBottom: 16 }}>For Press &amp; Partnerships</h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#444455', lineHeight: 1.8, marginBottom: 16 }}>
          Email <a href="mailto:support@hexlura.com" style={{ color: '#E63950' }}>support@hexlura.com</a> with the subject line &quot;Press&quot; or &quot;Partnership&quot;.
        </p>
      </div>
    </div>
  )
}
