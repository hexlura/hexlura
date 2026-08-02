import SectionHeader from './SectionHeader'

type ComparisonRow = {
  feature: string
  typical: string
  hexlura: string
  isCheck?: boolean
}

const ROWS: ComparisonRow[] = [
  { feature: 'Booking / service fee', typical: '5–12% per ticket', hexlura: '£0' },
  { feature: 'Monthly or listing fee', typical: 'Often required', hexlura: '£0' },
  { feature: 'Payout timing', typical: '7–30 days', hexlura: '2 business days' },
  {
    feature: 'Access to your buyer data',
    typical: 'Limited or paid tier',
    hexlura: '✓ Always included',
    isCheck: true,
  },
  {
    feature: 'QR check-in app',
    typical: 'Often a paid add-on',
    hexlura: '✓ Included',
    isCheck: true,
  },
  {
    feature: 'Cancel anytime',
    typical: 'Contract-dependent',
    hexlura: '✓ No contract',
    isCheck: true,
  },
]

export default function ComparisonSection() {
  return (
    <section
      id="compare"
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
          tag="The real cost"
          heading={
            <>
              See what you&apos;d actually{' '}
              <span style={{ color: 'var(--accent)' }}>keep.</span>
            </>
          }
          subheading="Most platforms quote a small booking fee and let the deductions pile up elsewhere — payment processing, payout delays, &ldquo;premium&rdquo; analytics. Here's the same £50 ticket, laid out honestly."
        />

        <div
          style={{
            background: 'var(--card)',
            border: '2px solid var(--text)',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{ width: '100%', borderCollapse: 'collapse' }}
              aria-label="Fee comparison table"
            >
              <thead>
                <tr>
                  <th
                    style={{
                      padding: '18px 24px 14px',
                      textAlign: 'left',
                      fontFamily: 'var(--font-mono), monospace',
                      fontSize: 11,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--muted)',
                      borderBottom: '2px solid var(--text)',
                    }}
                  >
                    What you&apos;re charged
                  </th>
                  <th
                    style={{
                      padding: '18px 24px 14px',
                      textAlign: 'left',
                      fontFamily: 'var(--font-mono), monospace',
                      fontSize: 11,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--muted)',
                      borderBottom: '2px solid var(--text)',
                    }}
                  >
                    Typical platform
                  </th>
                  <th
                    style={{
                      padding: '18px 24px 14px',
                      textAlign: 'left',
                      fontFamily: 'var(--font-mono), monospace',
                      fontSize: 11,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--accent)',
                      borderBottom: '2px solid var(--text)',
                    }}
                  >
                    Hexlura
                  </th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row, i) => (
                  <tr key={row.feature}>
                    <td
                      style={{
                        padding: '18px 24px',
                        fontSize: 14.5,
                        borderBottom: i < ROWS.length - 1 ? '1px dashed var(--border)' : 'none',
                        color: 'var(--text)',
                      }}
                    >
                      {row.feature}
                    </td>
                    <td
                      style={{
                        padding: '18px 24px',
                        fontSize: 14.5,
                        borderBottom: i < ROWS.length - 1 ? '1px dashed var(--border)' : 'none',
                        color: 'var(--muted)',
                      }}
                    >
                      {row.typical}
                    </td>
                    <td
                      style={{
                        padding: '18px 24px',
                        fontSize: 14.5,
                        fontWeight: 600,
                        color: row.isCheck ? 'var(--success)' : 'var(--accent)',
                        background: 'rgba(230, 57, 80, 0.04)',
                        borderBottom: i < ROWS.length - 1 ? '1px dashed var(--border)' : 'none',
                      }}
                    >
                      {row.hexlura}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p
          style={{
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 12.5,
            color: 'var(--muted)',
            marginTop: 14,
          }}
        >
          Illustrative comparison based on published rates across common UK ticketing platforms as
          of 2026. Always check current fees before switching.
        </p>
      </div>
    </section>
  )
}
