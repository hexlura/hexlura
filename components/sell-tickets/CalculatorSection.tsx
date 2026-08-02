import SectionHeader from './SectionHeader'
import { RevenueCalculator } from '@/components/organiser/RevenueCalculator'
import Link from 'next/link'

type CalculatorSectionProps = {
  ctaHref: string
}

export default function CalculatorSection({ ctaHref }: CalculatorSectionProps) {
  return (
    <section
      id="calculator"
      style={{ padding: '88px 0' }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: '0 32px',
        }}
      >
        <SectionHeader
          tag="Revenue calculator"
          heading={
            <>
              Run your own{' '}
              <span style={{ color: 'var(--accent)' }}>numbers.</span>
            </>
          }
          subheading={<> See how much extra revenue you could earn by selling tickets through <strong style={{ color: 'var(--accent)' }}>Hexlura</strong>.</>}
        />

        {/* The RevenueCalculator is now self-styled as a ticket card */}
        <RevenueCalculator
          accentColor="#E63950"
          showCta={false}
          ctaTextColor="#FFFFFF"
          maxWidth="100%"
        />

        <div
          style={{
            marginTop: 24,
            display: 'flex',
            gap: 14,
            flexWrap: 'wrap',
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
              e.currentTarget.style.boxShadow = '4px 4px 0 var(--text)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translate(0,0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            Start selling — free
          </Link>
        </div>
      </div>
    </section>
  )
}
