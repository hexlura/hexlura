import SectionHeader from './SectionHeader'

type Feature = { icon: string; title: string; body: string }

type FeatureGroup = {
  groupTitle: string
  features: Feature[]
}

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    groupTitle: 'Tickets & sales',
    features: [
      {
        icon: '▣',
        title: 'Instant ticket sales',
        body: 'Go live the moment you publish. No approval delays, ever.',
      },
      {
        icon: '◇',
        title: 'QR code tickets',
        body: 'Every order gets a unique code. Scan attendees in with the built-in app.',
      },
      {
        icon: '▤',
        title: 'Group tickets',
        body: 'Sell packages with an individual QR code generated for each member.',
      },
    ],
  },
  {
    groupTitle: 'Marketing & growth',
    features: [
      {
        icon: '◈',
        title: 'Promo codes',
        body: 'Fixed or percentage discounts for early birds, press or VIPs.',
      },
      {
        icon: '✉',
        title: 'Email campaigns',
        body: 'Reach past attendees directly when you announce your next date.',
      },
      {
        icon: '↗',
        title: 'Referral tracking',
        body: 'See exactly which channel — or which friend — sold each ticket.',
      },
    ],
  },
  {
    groupTitle: 'Analytics & payouts',
    features: [
      {
        icon: '▦',
        title: 'Live sales dashboard',
        body: 'Revenue, scans and attendance, updating in real time.',
      },
      {
        icon: '£',
        title: 'Fast payouts',
        body: 'Funds land in your account 2 business days after your event.',
      },
      {
        icon: '◎',
        title: 'Buyer data, always',
        body: 'Export attendee contact details whenever you need them. No paid tier.',
      },
    ],
  },
]

function FeatureCard({ feature }: { feature: Feature }) {
  return (
    <div
      style={{
        background: 'var(--card)',
        padding: '22px 20px',
      }}
    >
      <h4
        style={{
          fontSize: 15,
          marginBottom: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: 'var(--text)',
        }}
      >
        <span aria-hidden="true" style={{ color: 'var(--accent)', fontSize: 16 }}>
          {feature.icon}
        </span>
        {feature.title}
      </h4>
      <p
        style={{
          fontSize: 13,
          color: 'var(--muted)',
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        {feature.body}
      </p>
    </div>
  )
}

function FeatureGroup({ group }: { group: FeatureGroup }) {
  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--font-mono), monospace',
          fontSize: 12,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--accent)',
          fontWeight: 600,
          marginBottom: 18,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {group.groupTitle}
        <span
          aria-hidden="true"
          style={{
            flex: 1,
            borderTop: '1px dashed var(--border)',
          }}
        />
      </div>

      <div className="st-fg-grid">
        {group.features.map((f) => (
          <FeatureCard key={f.title} feature={f} />
        ))}
      </div>
    </div>
  )
}

export default function FeaturesSection() {
  return (
    <section id="features" style={{ padding: '88px 0' }}>
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: '0 32px',
        }}
      >
        <SectionHeader
          tag="Everything included"
          heading={
            <>
              Built for organisers,{' '}
              <span style={{ color: 'var(--accent)' }}>not overheads.</span>
            </>
          }
          subheading="No tiers, no upsells. Every feature below is unlocked from the moment you sign up."
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 44 }}>
          {FEATURE_GROUPS.map((group) => (
            <FeatureGroup key={group.groupTitle} group={group} />
          ))}
        </div>
      </div>

      <style>{`
        .st-fg-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2px;
          background: var(--border);
          border: 2px solid var(--text);
          border-radius: 6px;
          overflow: hidden;
        }
        @media (max-width: 800px) {
          .st-fg-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 520px) {
          .st-fg-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  )
}
