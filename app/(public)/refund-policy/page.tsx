import { getStaticPageMetadata } from '@/lib/seo'
import type { Metadata } from 'next'
import { getLatestLegalDocument } from '@/lib/legal'
import { PublishedLegalDocument } from '@/components/legal/PublishedLegalDocument'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
    return getStaticPageMetadata('/refund-policy')
}

export default async function RefundPolicyPage() {
  const doc = await getLatestLegalDocument('refund')
  if (doc) return <PublishedLegalDocument doc={doc} title="Refund Policy" />
  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 24px' }}>
        <h1 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 48, color: '#0A0A0F', marginBottom: 8 }}>
          REFUND POLICY
        </h1>
        <p style={{ fontSize: 11, color: '#444455', marginBottom: 40 }}>Last updated: August 2026</p>

        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 28, color: '#E63950', marginTop: 40, marginBottom: 16 }}>Event-Specific Refund Policies</h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#444455', lineHeight: 1.8, marginBottom: 16 }}>
          Each organiser sets their own refund policy for their event, shown on the event page before you book. That policy governs whether — and under what conditions — you can get a refund if you simply change your mind or can no longer attend.
        </p>

        <div style={{ borderTop: '1px solid #C0C0C8', margin: '40px 0' }} />

        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 28, color: '#E63950', marginTop: 40, marginBottom: 16 }}>If an Event Is Cancelled</h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#444455', lineHeight: 1.8, marginBottom: 16 }}>
          If an organiser cancels an event, every ticket holder receives a full refund of everything they paid, including the booking fee, automatically to their original payment method. You do not need to request this — we email you as soon as it happens.
        </p>

        <div style={{ borderTop: '1px solid #C0C0C8', margin: '40px 0' }} />

        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 28, color: '#E63950', marginTop: 40, marginBottom: 16 }}>Requesting a Refund</h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#444455', lineHeight: 1.8, marginBottom: 16 }}>
          If an event&apos;s policy allows refunds, you can request one from{' '}
          <a href="/bookings" style={{ color: '#E63950' }}>My Bookings</a>. Requests are reviewed by the event organiser and, where applicable, by Hexlura, before any refund is issued. Processing typically takes 5–10 business days once approved.
        </p>

        <div style={{ borderTop: '1px solid #C0C0C8', margin: '40px 0' }} />

        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 28, color: '#E63950', marginTop: 40, marginBottom: 16 }}>Booking Fee</h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#444455', lineHeight: 1.8, marginBottom: 16 }}>
          The platform booking fee is refunded in full when an event is cancelled by the organiser. For voluntary cancellations under an event&apos;s own refund policy, whether the booking fee is refunded depends on that event&apos;s stated terms.
        </p>

        <div style={{ borderTop: '1px solid #C0C0C8', margin: '40px 0' }} />

        <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 28, color: '#E63950', marginTop: 40, marginBottom: 16 }}>Contact</h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#444455', lineHeight: 1.8, marginBottom: 16 }}>
          Questions about a specific refund? <a href="mailto:support@hexlura.com" style={{ color: '#E63950' }}>support@hexlura.com</a>
        </p>
      </div>
    </div>
  )
}
