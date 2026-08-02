type Stat = { value: string; label: string }

const STATS: Stat[] = [
  { value: '£0', label: 'Monthly fee' },
  { value: '100%', label: 'Face value yours' },
  { value: '2 days', label: 'Payout after event' },
  { value: '24/7', label: 'Platform access' },
]

export default function StatsSection() {
  return (
    <section
      style={{
        background: 'var(--text)',
        color: '#FFFFFF',
        padding: '36px 0',
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: '0 32px',
        }}
      >
        <div className="st-stats-row">
          {STATS.map((stat) => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <b
                style={{
                  fontFamily: 'var(--font-heading), sans-serif',
                  fontSize: 32,
                  color: 'var(--gold)',
                  display: 'block',
                  lineHeight: 1.1,
                  marginBottom: 4,
                }}
              >
                {stat.value}
              </b>
              <span
                style={{
                  fontFamily: 'var(--font-mono), monospace',
                  fontSize: 12,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#C0C0C8',
                }}
              >
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .st-stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          text-align: center;
        }
        @media (max-width: 700px) {
          .st-stats-row {
            grid-template-columns: repeat(2, 1fr);
            gap: 28px 20px;
          }
        }
      `}</style>
    </section>
  )
}
