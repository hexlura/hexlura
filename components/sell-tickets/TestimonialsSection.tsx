import SectionHeader from './SectionHeader'

type Testimonial = {
  quote: string
  name: string
  role: string
  initials: string
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'Setup took ten minutes and payouts hit our account two days after doors closed. Didn\u2019t expect that from a free platform.',
    name: 'Marcus T.',
    role: 'Club night organiser, Manchester',
    initials: 'MT',
  },
  {
    quote:
      'We switched from a big-name platform and kept hundreds of pounds in fees on our first event alone. The dashboard is genuinely clean too.',
    name: 'Sarah K.',
    role: 'Events company, London',
    initials: 'SK',
  },
  {
    quote:
      'Check-in on the night was the real test. Scanned three hundred people through the door with zero hiccups.',
    name: 'Raj P.',
    role: 'Festival organiser, Birmingham',
    initials: 'RP',
  },
]

function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '2px solid var(--text)',
        borderRadius: 8,
        padding: 26,
        position: 'relative',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          fontFamily: 'var(--font-heading), sans-serif',
          fontSize: 40,
          color: 'var(--accent)',
          lineHeight: 0.6,
          display: 'block',
          marginBottom: 8,
        }}
      >
        &ldquo;
      </span>
      <p
        style={{
          fontSize: 14.5,
          lineHeight: 1.6,
          color: 'var(--muted)',
          marginBottom: 18,
          fontStyle: 'italic',
        }}
      >
        {t.quote}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          aria-hidden="true"
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'var(--gold)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-heading), sans-serif',
            color: '#FFFFFF',
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          {t.initials}
        </div>
        <div>
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 600,
              color: 'var(--text)',
            }}
          >
            {t.name}
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--muted)',
            }}
          >
            {t.role}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TestimonialsSection() {
  return (
    <section
      style={{
        padding: '88px 0',
        // background: 'var(--surface)',
        // borderTop: '2px solid var(--text)',
        // borderBottom: '2px solid var(--text)',
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: '0 32px',
        }}
      >
        <SectionHeader
          tag="Organiser stories"
          heading={
            <>
              Don&apos;t take our{' '}
              <span style={{ color: 'var(--accent)' }}>word for it.</span>
            </>
          }
        />

        <div className="st-quotes-grid">
          {TESTIMONIALS.map((t) => (
            <TestimonialCard key={t.name} t={t} />
          ))}
        </div>
      </div>

      <style>{`
        .st-quotes-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        @media (max-width: 900px) {
          .st-quotes-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  )
}
