type SectionHeaderProps = {
  tag: string
  heading: React.ReactNode
  subheading?: string | React.ReactNode
  centre?: boolean
  maxWidth?: number
}

export default function SectionHeader({
  tag,
  heading,
  subheading,
  centre = false,
  maxWidth = 640,
}: SectionHeaderProps) {
  return (
    <div
      style={{
        maxWidth: centre ? '100%' : maxWidth,
        marginBottom: 52,
        textAlign: centre ? 'center' : 'left',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: centre ? 'center' : 'flex-start',
          gap: 14,
          marginBottom: 16,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            fontWeight: 600,
            border: '1.5px solid var(--accent)',
            padding: '4px 10px',
            borderRadius: 20,
          }}
        >
          {tag}
        </span>
      </div>

      <h2
        style={{
          fontFamily: 'var(--font-heading), sans-serif',
          fontSize: 'clamp(30px, 4vw, 44px)',
          lineHeight: 1.05,
          marginBottom: subheading ? 14 : 0,
          color: 'var(--text)',
        }}
      >
        {heading}
      </h2>

      {subheading && (
        <p
          style={{
            color: 'var(--muted)',
            fontSize: 16,
            lineHeight: 1.6,
          }}
        >
          {subheading}
        </p>
      )}
    </div>
  )
}
